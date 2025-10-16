import axios from 'axios';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import isBetween from 'dayjs/plugin/isBetween.js';
import NodeCache from 'node-cache';

// Extend dayjs
dayjs.extend(customParseFormat);
dayjs.extend(isBetween);

// In-memory cache (10-minute TTL)
const cache = new NodeCache({ stdTTL: 600 });

// Creates a reusable Axios client for Shiprocket
function getClient(token) {
  return axios.create({
    baseURL: 'https://apiv2.shiprocket.in/v1/external/',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    timeout: 15000,
  });
}

// Simple delay helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Paginated fetch for all orders within date range
async function fetchAllOrders(token, from, to, perPage = 100) {
  const client = getClient(token);
  let page = 1;
  let totalPages = Infinity;
  const allOrders = [];

  while (page <= totalPages) {
    const params = { page, per_page: perPage };
    if (from) params.from = dayjs(from).format('YYYY-MM-DD');
    if (to)   params.to   = dayjs(to).format('YYYY-MM-DD');

    try {
      const resp = await client.get('orders', { params });
      const ordersPage = Array.isArray(resp.data.data) ? resp.data.data : [];
      allOrders.push(...ordersPage);

      const meta = resp.data.meta?.pagination;
      if (meta?.total_pages) totalPages = meta.total_pages;
      else if (ordersPage.length < perPage) totalPages = page;
    } catch (err) {
      console.error(`Error fetching page ${page}:`, err.message);
      break;
    }

    page++;
    await sleep(200);
  }

  return allOrders;
}

// Builds unique customer map from orders
function buildCustomerMap(orders) {
  const map = new Map();

  for (const o of orders) {
    const date = dayjs(o.channel_created_at || o.created_at, 'D MMM YYYY, hh:mm A');
    const key = o.customer_email?.trim().toLowerCase() || o.customer_phone || `guest_${o.id}`;

    if (!map.has(key)) {
      map.set(key, {
        id:           o.others?.customer_id || null,
        name:         o.customer_name || key,
        email:        o.customer_email || '',
        created_at:   date.isValid() ? date.toISOString() : new Date().toISOString(),
        total_spent:  parseFloat(o.total) || 0,
        orders_count: 1,
      });
    } else {
      const cust = map.get(key);
      cust.orders_count++;
      cust.total_spent += parseFloat(o.total) || 0;
      if (date.isValid() && date.isBefore(dayjs(cust.created_at))) {
        cust.created_at = date.toISOString();
      }
    }
  }

  return Array.from(map.values());
}

// Normalizes order date
function parseOrderDate(o) {
  return o.channel_created_at
    ? dayjs(o.channel_created_at, 'D MMM YYYY, hh:mm A')
    : dayjs(o.created_at);
}

// Generates monthly metrics for a given year
function getMonthlyData(orders, customers, year) {
  const months = [];
  const isCurrentYear = year === dayjs().year();
  const lastMonth = isCurrentYear ? dayjs().month() + 1 : 12;

  for (let m = 1; m <= lastMonth; m++) {
    const start = dayjs(`${year}-${m}-01`).startOf('month');
    const end   = start.endOf('month');

    const monthOrders = orders.filter(o => parseOrderDate(o).isBetween(start, end, null, '[]'));
    const newCustCount = customers.filter(c => dayjs(c.created_at).isBetween(start, end, null, '[]')).length;
    const totalOrders  = monthOrders.length;
    const refunds      = monthOrders.filter(o => /return/i.test(o.status) || /refunded/i.test(o.payment_status)).length;
    const cancels      = monthOrders.filter(o => /cancel/i.test(o.status)).length;

    months.push({
      month:             start.format('MMM'),
      orders:            totalOrders,
      newCustomer:       newCustCount,
      returningCustomer: Math.max(0, totalOrders - newCustCount),
      customerChurn:     refunds + cancels,
    });
  }

  return months;
}

// Builds a time-bucketed trend of new customers
function getNewCustomerTrend(customers, startDate, endDate) {
  const start = dayjs(startDate);
  const end   = dayjs(endDate);
  const span  = end.diff(start, 'day') + 1;
  const interval = span > 90 ? 'week' : 'day';
  const buckets = {};

  customers.forEach(c => {
    const d = dayjs(c.created_at);
    if (d.isBetween(start, end, null, '[]')) {
      const key = interval === 'week'
        ? d.startOf('week').format('YYYY-MM-DD')
        : d.format('YYYY-MM-DD');
      buckets[key] = (buckets[key] || 0) + 1;
    }
  });

  const trend = [];
  let cursor = start.clone();
  while (cursor.isBefore(end) || cursor.isSame(end, interval)) {
    const key = interval === 'week'
      ? cursor.startOf('week').format('YYYY-MM-DD')
      : cursor.format('YYYY-MM-DD');
    const label = interval === 'week'
      ? cursor.startOf('week').format('MMM D')
      : cursor.format('MMM D');

    trend.push({ date: label, value: buckets[key] || 0 });
    cursor = cursor.add(1, interval);
  }

  return trend;
}

// Top spenders among returning customers
function getTopReturningCustomers(customers, limit = 5) {
  return customers
    .filter(c => c.orders_count > 1)
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, limit)
    .map(c => ({
      id:         c.id,
      name:       c.name,
      email:      c.email,
      subscribed: dayjs(c.created_at).format('D MMM YYYY'),
      amount:     +c.total_spent.toFixed(2),
    }));
}

// Compare top locations current vs previous period
function computeTopLocations(orders, startISO, endISO, limit = 5) {
  const start = dayjs(startISO).startOf('day');
  const end   = dayjs(endISO).endOf('day');
  const span  = end.diff(start, 'day') + 1;

  const prevEnd   = start.subtract(1, 'day').endOf('day');
  const prevStart = prevEnd.subtract(span - 1, 'day').startOf('day');

  const tally = (from, to) => orders.reduce((acc, o) => {
    const d = dayjs(o.created_at, 'D MMM YYYY, hh:mm A');
    if (!d.isBetween(from, to, null, '[]')) return acc;
    const loc = `${o.customer_country || 'None'} · ${o.customer_state || 'None'} · ${o.customer_city || 'None'}`;
    acc[loc] = (acc[loc] || 0) + 1;
    return acc;
  }, {});

  const curr = tally(start, end);
  const prev = tally(prevStart, prevEnd);

  return Object.keys({ ...curr, ...prev })
    .map(loc => ({ location: loc, current: curr[loc] || 0, previous: prev[loc] || 0 }))
    .sort((a, b) => b.current - a.current)
    .slice(0, limit);
}

// Cohort retention over 12 months
function getCohortData(customers, orders) {
  const periods = 12;
  const cohorts = [];
  const cohortStart = dayjs().subtract(periods - 1, 'month').startOf('month');

  for (let i = 0; i < periods; i++) {
    const cohortMonth = cohortStart.add(i, 'month');
    const cohortUsers = customers.filter(c =>
      dayjs(c.created_at).isBetween(cohortMonth, cohortMonth.endOf('month'), null, '[]')
    );
    const total = cohortUsers.length;
    const retention = Array.from({ length: periods }, (_, j) => {
      const winStart = cohortMonth.add(j, 'month').startOf('month');
      const winEnd   = winStart.endOf('month');
      const reorders = new Set(
        orders
          .filter(o => cohortUsers.some(c => c.email === o.customer_email))
          .filter(o => dayjs(o.created_at, 'D MMM YYYY, hh:mm A').isBetween(winStart, winEnd, null, '[]'))
          .map(o => o.customer_email)
      );
      return total ? Number(((reorders.size / total) * 100).toFixed(1)) : null;
    });

    cohorts.push({ date: cohortMonth.format('MMM YYYY'), users: total, retention });
  }

  return cohorts;
}

// Main analytics endpoint
export const AnalyticsData = async (req, res) => {

  try {
    const token     = req.user.onboarding.step5.token;
    const endDate   = req.query.endDate   || dayjs().toISOString();
    const startDate = req.query.startDate || dayjs(endDate).subtract(30, 'day').toISOString();

    // Normalize date for cache
    const startKey = dayjs(startDate).format('YYYY-MM-DD');
    const endKey   = dayjs(endDate).format('YYYY-MM-DD');
    const cacheKey = `analytics|${token}|${startKey}|${endKey}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const year     = dayjs(startDate).year();
    const thisFrom = dayjs(`${year}-01-01`).startOf('day').toISOString();
    const thisTo   = dayjs(`${year}-12-31`).endOf('day').toISOString();
    const lastYear = year - 1;
    const lastFrom = dayjs(`${lastYear}-01-01`).startOf('day').toISOString();
    const lastTo   = dayjs(`${lastYear}-12-31`).endOf('day').toISOString();

    const [
      allOrders,
      thisOrders,
      lastOrders
    ] = await Promise.all([
      fetchAllOrders(token, startKey, endKey)
        .catch(err => { console.error('Error fetching allOrders:', err.message); return []; }),
      fetchAllOrders(token, thisFrom, thisTo)
        .catch(err => { console.error('Error fetching thisOrders:', err.message); return []; }),
      fetchAllOrders(token, lastFrom, lastTo)
        .catch(err => { console.error('Error fetching lastOrders:', err.message); return []; }),
    ]);

    const allCustomers  = buildCustomerMap(allOrders);
    const thisCustomers = buildCustomerMap(thisOrders);
    const lastCustomers = buildCustomerMap(lastOrders);

    const totalCust      = allCustomers.length;
    const newCustCount   = allCustomers.filter(c => c.orders_count === 1).length;
    const returningCount = allCustomers.filter(c => c.orders_count > 1).length;
    const churnCount     = totalCust > 0
      ? parseFloat((100 - (returningCount / totalCust) * 100).toFixed(2))
      : 0;


    const analytics = {
      summary: {
        visitor:  { total: totalCust, new: newCustCount, returning: returningCount, churn: churnCount },
        customer: { total: totalCust, new: newCustCount, returning: returningCount, churn: churnCount },
      },
      returningCustomers: getTopReturningCustomers(allCustomers),
      locations:          computeTopLocations(allOrders, startDate, endDate),
      newCustomersTotal:  newCustCount,
      charts: {
        visitor:          getMonthlyData(thisOrders, thisCustomers, year),
        customer:         getMonthlyData(thisOrders, thisCustomers, year),
        newCustomerTrend: getNewCustomerTrend(allCustomers, startDate, endDate),
        visitorLastYear:  getMonthlyData(lastOrders, lastCustomers, lastYear),
        customerLastYear: getMonthlyData(lastOrders, lastCustomers, lastYear),
      },
      cohort: getCohortData(allCustomers, allOrders),
    };

    cache.set(cacheKey, analytics);
    return res.status(200).json(analytics);
  } catch (e) {
    console.error('AnalyticsData error:', e);
    return res.status(500).json({ message: 'Failed to fetch analytics', error: e.message });
  }

};

// Chart-only endpoint
export const getAnalyticsChart = async (req, res) => {

  try {
    const token       = req.user.onboarding.step5.token;
    const queryYear    = Number(req.query.year);
    const type         = (req.query.type || 'customer').toLowerCase();

    // Determine year bounds
    const currentYear = dayjs().year();
    const year        = (!queryYear || queryYear < currentYear - 5 || queryYear > currentYear)
      ? currentYear : queryYear;
    const from        = dayjs(`${year}-01-01`).startOf('day').toISOString();
    const to          = dayjs(`${year}-12-31`).endOf('day').toISOString();

    // Cache key per token, period and type
    const cacheKey = `analyticsChart|${token}|${type}|${year}`;
    const cached   = cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    // Fetch orders and compute
    const [allOrders] = await Promise.all([
      fetchAllOrders(token, from, to)
        .catch(err => { console.error('Error fetching chart orders:', err.message); return []; }),
    ]);
    const allCustomers = buildCustomerMap(allOrders);
    const data         = getMonthlyData(allOrders, allCustomers, year);
    const result       = type === 'visitor' ? { visitor: data } : { customer: data };

    // Cache and return
    cache.set(cacheKey, result);
    return res.status(200).json(result);
  } catch (e) {
    console.error('getAnalyticsChart error:', e);
    return res.status(500).json({ message: 'Failed to fetch chart', error: e.message });
  }

};


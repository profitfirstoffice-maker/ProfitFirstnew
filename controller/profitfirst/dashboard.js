import axios from "axios";
import axiosRetry from "axios-retry";
import ProductCost from "../../model/ProductCost.js";
import { eachDayOfInterval, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import DataCacheService from "../../services/dataCache.js";
import { fetchMetaOverview, fetchMetaDaily } from "../../services/metaService.js";
import { getShiprocketData } from "../../services/shiprocketService.js";

const SHOPIFY_API_VERSION = "2025-07";
const IST_TIMEZONE = "Asia/Kolkata";

// ============ DATE HELPERS ============
const toYMD = (date) => date.toISOString().split("T")[0];

const toISTDay = (date) => formatInTimeZone(date, IST_TIMEZONE, "yyyy-MM-dd");

// 🔧 Fixed Date Range in IST
const toISTDate = (dateStr) => {
  const date = new Date(dateStr);
  const istOffset = 330 * 60 * 1000; // 5h30m in ms
  const istDate = new Date(date.getTime() + istOffset);
  return istDate.toISOString().split("T")[0]; // Return YYYY-MM-DD
};

const toISTLabel = (date) => formatInTimeZone(date, IST_TIMEZONE, "MMM d");

const toUTCISO = (dateStr, endOfDay = false) => {
  const d = new Date(`${dateStr}T${endOfDay ? "23:59:59" : "00:00:00"}+05:30`);
  return d.toISOString();
};

// ============ FORMAT HELPERS ============
const formatToINR = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const toNum = (v) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    if (!t || t === "n/a" || t === "na" || t === "-") return 0;
    const cleaned = t.replace(/,/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

// ============ SHOPIFY BULK QUERY ============

// ============ PRODUCT COST ============
const getProductCosts = async (userId) => {
  try {
    if (!userId) return new Map();
    const costData = await ProductCost.findOne({ userId });
    if (!costData) return new Map();
    return new Map(costData.products.map((p) => [p.productId, p.cost]));
  } catch (e) {
    console.error("Error fetching product costs:", e.message);
    return new Map();
  }
};

// ============ SHOPIFY BULK QUERY (EXPORTED FOR SYNC JOB) ============
export async function getShopifyData(apiToken, shopUrl, startDate, endDate) {
  const endpoint = `https://${shopUrl}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  const headers = {
    "X-Shopify-Access-Token": apiToken,
    "Content-Type": "application/json",
  };

  // Shopify requires UTC ISO
  const startISO = toUTCISO(startDate, false);
  const endISO = toUTCISO(endDate, true);

  const filter = `created_at:>='${startISO}' AND created_at:<='${endISO}'`;

  try {
    await ensureNoActiveBulkOperation(endpoint, headers);
    const bulkQuery = `{ orders(query: "${escapeForGql(
      filter
    )}") { edges { node { __typename id createdAt totalPriceSet { shopMoney { amount currencyCode } } customer { id } lineItems { edges { node { __typename id quantity product { __typename id title } variant { __typename id product { __typename id title } } } } } } } } }`;
    await startBulkWithRetry(endpoint, headers, bulkQuery);
    const url = await pollForBulkUrl(endpoint, headers);
    const text = await downloadText(url);

    const orders = [];
    const ordersById = new Map(),
      lineItemsByOrder = new Map(),
      lineItems = new Map(),
      variantByLineItem = new Map(),
      productByVariant = new Map(),
      directProductByLineItem = new Map();

    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      let obj;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }
      if (!obj?.id) continue;
      const t = obj.__typename,
        id = obj.id,
        parent = obj.__parentId;
      if (t === "Order") {
        ordersById.set(id, obj);
      } else if (t === "LineItem" && parent) {
        lineItems.set(id, { id, quantity: obj.quantity ?? 0 });
        if (!lineItemsByOrder.has(parent)) lineItemsByOrder.set(parent, []);
        lineItemsByOrder.get(parent).push(id);
        if (obj.product?.id)
          directProductByLineItem.set(id, {
            id: obj.product.id,
            title: obj.product.title,
          });
        if (obj.variant?.id) {
          variantByLineItem.set(id, obj.variant.id);
          if (obj.variant?.product?.id) {
            productByVariant.set(obj.variant.id, {
              id: obj.variant.product.id,
              title: obj.variant.product.title,
            });
          }
        }
      }
    }

    for (const [oid, order] of ordersById.entries()) {
      const edges = [];
      for (const liId of lineItemsByOrder.get(oid) || []) {
        const li = lineItems.get(liId);
        if (!li) continue;
        let prod = directProductByLineItem.get(liId);
        if (!prod) {
          const varId = variantByLineItem.get(liId);
          if (varId) prod = productByVariant.get(varId);
        }
        if (prod?.id) {
          edges.push({
            node: {
              quantity: li.quantity,
              product: { id: prod.id, title: prod.title ?? "Unknown" },
            },
          });
        }
      }
      orders.push({
        createdAt: order.createdAt,
        totalPriceSet: order.totalPriceSet,
        customer: order.customer,
        lineItems: { edges },
      });
    }
    return orders;
  } catch (err) {
    console.error("Shopify Error:", err.message);
    throw new Error("Shopify bulk query failed");
  }
}

// Shopify bulk helpers
async function ensureNoActiveBulkOperation(endpoint, headers) {
  const op = await getCurrentBulkOperation(endpoint, headers);
  if (op && ["CREATED", "RUNNING", "CANCELING"].includes(op.status)) {
    await safeCancelBulk(endpoint, headers, op.id);
    let retries = 0;
    while (true) {
      const cur = await getCurrentBulkOperation(endpoint, headers);
      if (!cur || ["FAILED", "CANCELED", "COMPLETED"].includes(cur.status))
        break;
      await sleep(Math.min(1000 * 2 ** retries, 16000));
      retries++;
    }
  }
}
async function startBulkWithRetry(endpoint, headers, gql) {
  let retries = 0;
  while (retries < 3) {
    try {
      const res = await axios.post(
        endpoint,
        {
          query: `mutation { bulkOperationRunQuery(query: """${gql}""") { bulkOperation { id status } userErrors { message } } }`,
        },
        { headers }
      );
      const errs = res.data?.data?.bulkOperationRunQuery?.userErrors || [];
      if (!errs.length) return;
      if (errs[0].message.includes("already in progress")) {
        retries++;
        await ensureNoActiveBulkOperation(endpoint, headers);
        continue;
      }
      throw new Error(errs.map((e) => e.message).join("; "));
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        await sleep(2000 * (retries + 1));
        retries++;
        continue;
      }
      throw err;
    }
  }
  throw new Error("Bulk start failed after retries");
}
async function pollForBulkUrl(endpoint, headers) {
  let retries = 0;
  while (true) {
    const op = await getCurrentBulkOperation(endpoint, headers);
    if (!op) throw new Error("No bulk op");
    if (op.status === "COMPLETED") return op.url || op.partialDataUrl;
    if (["FAILED", "CANCELED"].includes(op.status))
      throw new Error("Bulk failed/canceled");
    await sleep(Math.min(2000 * 1.5 ** retries, 8000));
    retries++;
  }
}
async function getCurrentBulkOperation(endpoint, headers) {
  const res = await axios.post(
    endpoint,
    {
      query: `query { currentBulkOperation { id status errorCode url partialDataUrl } }`,
    },
    { headers }
  );
  return res.data?.data?.currentBulkOperation || null;
}
async function safeCancelBulk(endpoint, headers, id) {
  await axios.post(
    endpoint,
    {
      query: `mutation Cancel($id: ID!) { bulkOperationCancel(id: $id) { userErrors { message } } }`,
      variables: { id },
    },
    { headers }
  );
}
async function downloadText(url) {
  const res = await axios.get(url, { responseType: "text" });
  return res.data;
}
function escapeForGql(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ============ MAIN DASHBOARD ============
export const dashboard = async (req, res) => {
  try {
    const { user } = req;
    const SHOP = user.onboarding.step2.storeUrl;
    const SHOPIFY_TOKEN = user.onboarding.step2.accessToken;
    const AD_ACCOUNT_ID = user.onboarding.step4.adAccountId;
    const META_TOKEN = user.onboarding.step4.accessToken;
    const SHIPROCKET_TOKEN = user.onboarding.step5.token;

    let { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      const today = new Date();
      endDate = toYMD(today);
      const d30 = new Date(today);
      d30.setDate(today.getDate() - 29);
      startDate = toYMD(d30);
    }

    // 🔧 Normalize to IST once here
    startDate = toISTDate(startDate);
    endDate = toISTDate(endDate);

    // Check if we need to refresh data
    const shouldRefresh = await DataCacheService.shouldRefresh(
      user._id,
      'dashboard_summary',
      startDate,
      endDate
    );

    let shopifyOrders, metaOverview, metaDaily, shiprocket;

    if (shouldRefresh) {
      console.log(`[DASHBOARD] Fetching fresh data for user ${user._id}...`);
      
      // Fetch from APIs
      const [shopifyRes, metaOverviewRes, metaDailyRes, shiprocketRes] =
        await Promise.allSettled([
          getShopifyData(SHOPIFY_TOKEN, SHOP, startDate, endDate),
          fetchMetaOverview(META_TOKEN, AD_ACCOUNT_ID, startDate, endDate),
          fetchMetaDaily(META_TOKEN, AD_ACCOUNT_ID, startDate, endDate),
          getShiprocketData(SHIPROCKET_TOKEN, startDate, endDate),
        ]);

      if (shopifyRes.status === "rejected") {
        throw new Error("Shopify data failed, try shorter date range");
      }

      shopifyOrders = shopifyRes.value;
      metaOverview = metaOverviewRes.status === "fulfilled" ? metaOverviewRes.value : {};
      metaDaily = metaDailyRes.status === "fulfilled" ? metaDailyRes.value : [];
      shiprocket = shiprocketRes.status === "fulfilled"
        ? shiprocketRes.value
        : { totalShippingCost: 0, dailyShippingCosts: new Map(), shipping: [] };

      // Save to cache
      try {
        await Promise.all([
          DataCacheService.set(user._id, 'shopify_orders', startDate, endDate, shopifyOrders),
          DataCacheService.set(user._id, 'meta_ads', startDate, endDate, { overview: metaOverview, daily: metaDaily }),
          DataCacheService.set(user._id, 'shiprocket', startDate, endDate, shiprocket)
        ]);
        console.log(`[DASHBOARD] ✓ All data cached successfully for user ${user._id}`);
      } catch (cacheError) {
        console.error(`[DASHBOARD] ✗ Cache save error:`, cacheError.message);
        // Continue anyway - we have the data to return
      }
    } else {
      console.log(`[DASHBOARD] Using cached data for user ${user._id}`);
      
      // Get from cache
      const [cachedShopify, cachedMeta, cachedShiprocket] = await Promise.all([
        DataCacheService.get(user._id, 'shopify_orders', startDate, endDate),
        DataCacheService.get(user._id, 'meta_ads', startDate, endDate),
        DataCacheService.get(user._id, 'shiprocket', startDate, endDate)
      ]);

      shopifyOrders = cachedShopify || [];
      metaOverview = cachedMeta?.overview || {};
      metaDaily = cachedMeta?.daily || [];
      shiprocket = cachedShiprocket || { totalShippingCost: 0, dailyShippingCosts: new Map(), shipping: [] };
    }

    const productCosts = await getProductCosts(user._id);

    // ---- Calculate ----
    let totalRevenue = 0,
      totalCOGS = 0,
      totalOrders = shopifyOrders.length;
    const productSales = {};
    const customerOrders = {};

    const dateInterval = eachDayOfInterval({
      start: parseISO(startDate),
      end: parseISO(endDate),
    });

    const dailyData = {};
    dateInterval.forEach((d) => {
      const key = toISTLabel(d);
      dailyData[key] = {
        name: key,
        revenue: 0,
        cogs: 0,
        totalCosts:
          (metaDaily.find((m) => m.name === key)?.spend || 0) +
          (shiprocket.dailyShippingCosts.get(key) || 0),
        netProfit: 0,
        netProfitMargin: 0,
      };
    });

    const dailyCustomerBreakdown = {};
    dateInterval.forEach((d) => {
      const key = toISTLabel(d);
      dailyCustomerBreakdown[key] = { newCustomers: 0, returningCustomers: 0 };
    });

    for (const order of shopifyOrders) {
      const orderRevenue = parseFloat(
        order.totalPriceSet?.shopMoney?.amount || 0
      );
      totalRevenue += orderRevenue;

      const dayKey = toISTLabel(order.createdAt);
      if (dailyData[dayKey]) dailyData[dayKey].revenue += orderRevenue;

      const cid = order.customer?.id;
      if (cid) {
        if (!customerOrders[cid]) customerOrders[cid] = [];
        customerOrders[cid].push(parseISO(order.createdAt));
      }

      let orderCOGS = 0;
      for (const { node: item } of order.lineItems?.edges || []) {
        const pid = item.product?.id?.split("/")?.pop();
        if (!pid) continue;
        const cost = productCosts.get(pid) || 0;
        const itemCOGS = cost * (item.quantity || 0);
        orderCOGS += itemCOGS;

        if (!productSales[pid]) {
          productSales[pid] = {
            name: item.product?.title || "Unknown",
            sales: 0,
            total: 0,
          };
        }
        productSales[pid].sales += item.quantity;
        productSales[pid].total += orderRevenue;
      }
      totalCOGS += orderCOGS;
      if (dailyData[dayKey]) dailyData[dayKey].cogs += orderCOGS;
    }

    Object.values(dailyData).forEach((d) => {
      d.totalCosts += d.cogs;
      d.netProfit = d.revenue - d.totalCosts;
      d.netProfitMargin = d.revenue ? (d.netProfit / d.revenue) * 100 : 0;
    });

    let newCustomers = 0,
      returningCustomers = 0;
    for (const cid of Object.keys(customerOrders)) {
      const orderDates = customerOrders[cid].sort(
        (a, b) => a.getTime() - b.getTime()
      );
      const firstKey = toISTLabel(orderDates[0]);
      dailyCustomerBreakdown[firstKey].newCustomers++;
      const uniqueDays = new Set(orderDates.map((d) => toISTLabel(d)));
      if (uniqueDays.size > 1) {
        returningCustomers++;
        [...uniqueDays].slice(1).forEach((k) => {
          if (dailyCustomerBreakdown[k])
            dailyCustomerBreakdown[k].returningCustomers++;
        });
      } else {
        newCustomers++;
      }
    }

    const totalCustomers = newCustomers + returningCustomers;
    const grossProfit = totalRevenue - totalCOGS;
    const adsSpend = metaOverview.spend || 0;
    const netProfit = grossProfit - adsSpend - shiprocket.totalShippingCost;
    const grossProfitMargin = totalRevenue
      ? (grossProfit / totalRevenue) * 100
      : 0;
    const netProfitMargin = totalRevenue ? (netProfit / totalRevenue) * 100 : 0;
    const poas = adsSpend ? netProfit / adsSpend : 0;
    const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
    const cpp = totalOrders ? adsSpend / totalOrders : 0;
    const returningRate = totalCustomers
      ? (returningCustomers / totalCustomers) * 100
      : 0;
    const roasValue =
      typeof metaOverview.purchase_roas === "number"
        ? metaOverview.purchase_roas
        : 0;

    const sortedProducts = Object.values(productSales).sort(
      (a, b) => b.sales - a.sales
    );
    const bestSelling = sortedProducts
      .slice(0, 10)
      .map((p, i) => ({ ...p, id: i + 1, total: formatToINR(p.total) }));
    const leastSelling = sortedProducts
      .slice(-10)
      .reverse()
      .map((p, i) => ({ ...p, id: i + 11, total: formatToINR(p.total) }));

    const customerChartData = dateInterval.map((d) => {
      const key = toISTLabel(d);
      const { newCustomers: nc = 0, returningCustomers: rc = 0 } =
        dailyCustomerBreakdown[key] || {};
      return { name: key, newCustomers: nc, returningCustomers: rc };
    });
    const marketingChartData = metaDaily.map((d) => ({
      name: d.name,
      reach: d.reach,
      spend: d.spend,
      roas: d.roas,
      linkClicks: d.linkClicks,
    }));

    const response = {
      summary: [
        { title: "Total Orders", value: totalOrders, formula: "Total Sales" },
        {
          title: "Revenue",
          value: formatToINR(totalRevenue),
          formula: "Total revenue",
        },
        {
          title: "COGS",
          value: formatToINR(totalCOGS),
          formula: "Cost of Goods Sold",
        },
        {
          title: "Ads Spend",
          value: formatToINR(adsSpend),
          formula: "Ad spend",
        },
        {
          title: "Shipping Cost",
          value: formatToINR(shiprocket.totalShippingCost),
          formula: "Shipping costs",
        },
        {
          title: "Net Profit",
          value: formatToINR(netProfit),
          formula: "Revenue - costs",
        },
        {
          title: "Gross Profit",
          value: formatToINR(grossProfit),
          formula: "Revenue - COGS",
        },
        {
          title: "Gross Profit Margin",
          value: `${grossProfitMargin.toFixed(2)}%`,
          formula: "(Gross / Revenue) * 100",
        },
        {
          title: "Net Profit Margin",
          value: `${netProfitMargin.toFixed(2)}%`,
          formula: "(Net / Revenue) * 100",
        },
        {
          title: "ROAS",
          value: roasValue.toFixed(2),
          formula: "Return On Ad Spend",
        },
        {
          title: "POAS",
          value: poas.toFixed(2),
          formula: "Net Profit / Ads Spend",
        },
        {
          title: "Avg. Order Value",
          value: formatToINR(avgOrderValue),
          formula: "Rev / Orders",
        },
      ],
      marketing: [
        {
          title: "Amount Spent",
          value: formatToINR(adsSpend),
          formula: "Ad spend",
        },
        { title: "CPP", value: formatToINR(cpp), formula: "Spend / Orders" },
        {
          title: "ROAS",
          value: roasValue.toFixed(2),
          formula: "Return On Ad Spend",
        },
        {
          title: "Link Clicks",
          value: metaOverview.clicks || 0,
          formula: "Ad clicks",
        },
        {
          title: "CPC",
          value: formatToINR(metaOverview.cpc || 0),
          formula: "Spend / Clicks",
        },
        {
          title: "CTR",
          value: `${(metaOverview.ctr || 0).toFixed(2)}%`,
          formula: "Clicks / Impressions",
        },
        {
          title: "Impressions",
          value: metaOverview.impressions || 0,
          formula: "Ad impressions",
        },
        {
          title: "CPM",
          value: formatToINR(metaOverview.cpm || 0),
          formula: "Spend per 1000 Impr",
        },
        {
          title: "Reach",
          value: metaOverview.reach || 0,
          formula: "Unique reach",
        },
      ],
      website: [
        {
          title: "Total Sales",
          value: formatToINR(totalRevenue),
          formula: "Total sales",
        },
        { title: "Total Orders", value: totalOrders, formula: "Order count" },
        {
          title: "Total Customers",
          value: totalCustomers,
          formula: "New + Returning",
        },
        {
          title: "Returning Rate",
          value: `${returningRate.toFixed(2)}%`,
          formula: "Returning / Total",
        },
      ],
      shipping: shiprocket.shipping,
      products: { bestSelling, leastSelling },
      performanceChartData: Object.values(dailyData),
      financialsBreakdownData: {
        revenue: totalRevenue,
        list: [
          { name: "Revenue", value: totalRevenue, color: "#16A34A" },
          { name: "Gross Profit", value: grossProfit, color: "#2563EB" },
          { name: "Net Profit", value: netProfit, color: "#FBBF24" },
          { name: "COGS", value: totalCOGS, color: "#F43F5E" },
          { name: "Ads Spend", value: adsSpend, color: "#A855F7" },
          {
            name: "Shipping",
            value: shiprocket.totalShippingCost,
            color: "#6366F1",
          },
        ],
        pieData: [
          { name: "COGS", value: totalCOGS, color: "#F43F5E" },
          { name: "Ads Spend", value: adsSpend, color: "#A855F7" },
          {
            name: "Shipping",
            value: shiprocket.totalShippingCost,
            color: "#6366F1",
          },
          ...(netProfit > 0
            ? [{ name: "Net Profit", value: netProfit, color: "#FBBF24" }]
            : []),
        ],
      },
      charts: {
        websiteTraffic: [
          { name: "New Customers", value: newCustomers },
          { name: "Returning Customers", value: returningCustomers },
        ],
        customerTypeByDay: customerChartData,
        marketing: marketingChartData,
      },
    };

    res.status(200).json(response);
  } catch (err) {
    console.error("Dashboard Error:", err.message);
    res
      .status(500)
      .json({ message: "Dashboard fetch failed", error: err.message });
  }
};

// all-in-one: getDataAi.js
import axios from "axios";
import axiosRetry from "axios-retry";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import ProductCost from "../model/ProductCost.js";

const META_API_VERSION = "v23.0";
const SHOPIFY_API_VERSION = "2025-07";
const IST_TIMEZONE = "Asia/Kolkata";

// Utility functions
const toYMD = (date) => format(date, "yyyy-MM-dd");
const toISTDate = (dateStr) => {
  const date = new Date(dateStr);
  const istOffset = 330 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffset);
  return format(istDate, "yyyy-MM-dd");
};
const toISTLabel = (date) => formatInTimeZone(date, IST_TIMEZONE, "MMM d");
const toUTCISO = (dateStr, endOfDay = false) => {
  const timeStr = endOfDay ? "23:59:59" : "00:00:00";
  const d = new Date(`${dateStr}T${timeStr}+05:30`);
  return d.toISOString();
};
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

// Axios client setup
const metaApiClient = axios.create({
  baseURL: `https://graph.facebook.com/${META_API_VERSION}`,
  timeout: 15000,
});
axiosRetry(metaApiClient, {
  retries: 3,
  retryDelay: (count) => count * 2000,
  retryCondition: (err) =>
    axiosRetry.isNetworkError(err) || err.response?.status >= 500,
});

// Fetch product costs
const getProductCosts = async (userId) => {
  try {
    if (!userId) return new Map();
    const costData = await ProductCost.findOne({ userId });
    if (!costData || !costData.products) return new Map();
    return new Map(costData.products.map((p) => [p.productId, p.cost]));
  } catch (e) {
    console.error("Error fetching product costs:", e.message);
    return new Map();
  }
};

/**
 * Fetch Meta daily insights
 */
const fetchMetaDaily = async (apiToken, adAccountId, startDate, endDate) => {
  if (!apiToken || !adAccountId) return [];
  const interval = eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate),
  });
  const template = interval.map((d) => ({
    name: toISTLabel(d),
    reach: 0,
    spend: 0,
    roas: 0,
    linkClicks: 0,
    impressions: 0,
    ctr: 0,
    cpc: 0,
    cpm: 0,
  }));
  try {
    const formattedStart = toISTDate(startDate);
    const formattedEnd = toISTDate(endDate);
    const url = `/act_${adAccountId}/insights`;
    const params = {
      access_token: apiToken,
      time_range: JSON.stringify({ since: formattedStart, until: formattedEnd }),
      fields: "spend,purchase_roas,clicks,impressions,reach,ctr,cpc,cpm",
      time_increment: 1,
    };
    const { data } = await metaApiClient.get(url, { params });
    const map = new Map();

    for (const ins of data?.data || []) {
      const name = toISTLabel(parseISO(ins.date_start));
      map.set(name, {
        name,
        reach: toNum(ins.reach),
        spend: toNum(ins.spend),
        roas: ins.purchase_roas ? toNum(ins.purchase_roas[0]?.value) : 0,
        linkClicks: toNum(ins.clicks),
        impressions: toNum(ins.impressions),
        ctr: toNum(ins.ctr),
        cpc: toNum(ins.cpc),
        cpm: toNum(ins.cpm),
      });
    }

    return template.map((d) => map.get(d.name) || d);
  } catch (err) {
    console.error("Meta Daily Error:", err.message);
    return template;
  }
};

/**
 * Fetch Shiprocket data
 */
const getShiprocketData = async (apiToken, startDate, endDate) => {
  const url = `https://apiv2.shiprocket.in/v1/external/shipments`;
  const headers = { Authorization: `Bearer ${apiToken}` };
  const PER_PAGE = 100;

  const dailyShippingSummary = new Map();

  try {
    let page = 1;
    while (true) {
      const { data } = await axios.get(url, {
        headers,
        params: { from: startDate, to: endDate, per_page: PER_PAGE, page },
      });
      const rows = data?.data || [];
      if (rows.length === 0) break;

      for (const order of rows) {
        const status = (order.status || "").toLowerCase();
        const orderDate = order.order_date ? toISTLabel(parseISO(order.order_date)) : "";
        
        if (!orderDate) continue;

        // Initialize daily summary if not exists
        if (!dailyShippingSummary.has(orderDate)) {
          dailyShippingSummary.set(orderDate, {
            totalShipments: 0,
            pickupPending: 0,
            inTransit: 0,
            delivered: 0,
            ndrPending: 0,
            rto: 0,
            canceled: 0,
            cod: 0,
            prepaid: 0,
            shippingCost: 0
          });
        }

        const daily = dailyShippingSummary.get(orderDate);
        daily.totalShipments++;

        // Status-based classification
        if (status.includes("rto")) {
          daily.rto++;
        } else if (status.includes("pickup pending")) {
          daily.pickupPending++;
        } else if (status.includes("in-transit") || status.includes("in transit")) {
          daily.inTransit++;
        } else if (status.includes("ndr")) {
          daily.ndrPending++;
        } else if (status.includes("delivered")) {
          daily.delivered++;
        } else if (status.includes("cancelled") || status.includes("canceled")) {
          daily.canceled++;
        }

        // Shipping cost calculation
        const ch = order.charges || {};
        let cost = toNum(ch.freight_charges) + toNum(ch.cod_charges);
        if (status.includes("rto")) {
          cost += toNum(ch.charged_weight_amount_rto) || toNum(ch.applied_weight_amount_rto);
        }
        daily.shippingCost += cost;

        // Payment method classification
        const pm = (order.payment_method || "").toLowerCase();
        if (pm === "cod") {
          daily.cod++;
        } else if (pm === "prepaid") {
          daily.prepaid++;
        }
      }

      if (rows.length < PER_PAGE) break;
      page++;
    }
  } catch (e) {
    console.error("Shiprocket fetch error:", e.message);
  }

  return { dailyShippingSummary };
};

/**
 * Fetch Shopify data
 */
const getShopifyData = async (apiToken, shopUrl, startDate, endDate) => {
  const endpoint = `https://${shopUrl}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  const headers = {
    "X-Shopify-Access-Token": apiToken,
    "Content-Type": "application/json",
  };

  const startISO = toUTCISO(startDate, false);
  const endISO = toUTCISO(endDate, true);
  const filter = `created_at:>='${startISO}' AND created_at:<='${endISO}'`;

  // Shopify bulk query helper
  const ensureNoActiveBulkOperation = async () => {
    const getCurrentBulkOperation = async () => {
      const res = await axios.post(
        endpoint,
        {
          query: `query { currentBulkOperation { id status errorCode url partialDataUrl } }`,
        },
        { headers }
      );
      return res.data?.data?.currentBulkOperation || null;
    };
    const safeCancelBulk = async (id) => {
      await axios.post(
        endpoint,
        {
          query: `mutation Cancel($id: ID!) { bulkOperationCancel(id: $id) { userErrors { message } } }`,
          variables: { id },
        },
        { headers }
      );
    };
    const op = await getCurrentBulkOperation();
    if (op && ["CREATED", "RUNNING", "CANCELING"].includes(op.status)) {
      await safeCancelBulk(op.id);
      let retries = 0;
      while (true) {
        const cur = await getCurrentBulkOperation();
        if (!cur || ["FAILED", "CANCELED", "COMPLETED"].includes(cur.status))
          break;
        await new Promise(resolve => setTimeout(resolve, 2000));
        retries++;
      }
    }
  };

  const startBulkWithRetry = async (gql) => {
    let retries = 0;
    while (retries < 3) {
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
        await ensureNoActiveBulkOperation();
        retries++;
        continue;
      }
      throw new Error(errs.map((e) => e.message).join("; "));
    }
    throw new Error("Shopify bulk run failed");
  };

  const pollForBulkUrl = async () => {
    let retries = 0;
    while (true) {
      const res = await axios.post(
        endpoint,
        {
          query: `query { currentBulkOperation { id status errorCode url partialDataUrl } }`,
        },
        { headers }
      );
      const op = res.data?.data?.currentBulkOperation;
      if (!op) throw new Error("No bulk operation");
      if (op.status === "COMPLETED") return op.url || op.partialDataUrl;
      if (["FAILED", "CANCELED"].includes(op.status))
        throw new Error(`Bulk failed: ${op.errorCode || "Unknown"}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      retries++;
    }
  };

  const downloadText = async (url) => {
    const res = await axios.get(url, { responseType: "text" });
    return res.data;
  };

  const escapeForGql = (str) => {
    return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
  };

  // Run bulk query
  await ensureNoActiveBulkOperation();
  const gql = `{ orders(query: "${escapeForGql(filter)}") { edges { node { __typename id createdAt totalPriceSet { shopMoney { amount currencyCode } } customer { id } lineItems { edges { node { id quantity product { id title } variant { id product { id title } } } } } } } } }`;
  await startBulkWithRetry(gql);
  const url = await pollForBulkUrl();
  const text = await downloadText(url);

  // Parse bulk data
  const orders = [];
  const ordersById = new Map();
  const lineItemsByOrder = new Map();
  const lineItems = new Map();
  const variantByLineItem = new Map();
  const productByVariant = new Map();
  const directProductByLineItem = new Map();

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
      orders.push(obj);
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

  // Build orders array with line items
  const finalOrders = [];
  for (const order of orders) {
    const oId = order.id;
    const lineIds = lineItemsByOrder.get(oId) || [];
    const lineNodes = [];
    for (const liId of lineIds) {
      const li = lineItems.get(liId);
      if (!li) continue;
      let prod = directProductByLineItem.get(liId);
      if (!prod) {
        const vId = variantByLineItem.get(liId);
        if (vId) prod = productByVariant.get(vId);
      }
      if (prod?.id) {
        lineNodes.push({
          node: {
            quantity: li.quantity,
            product: { id: prod.id, title: prod.title ?? "Unknown" },
          },
        });
      }
    }
    finalOrders.push({
      createdAt: order.createdAt,
      totalPriceSet: order.totalPriceSet,
      customer: order.customer,
      lineItems: { edges: lineNodes },
    });
  }

  return finalOrders;
};

//=========== MAIN FUNCTION =======  
export const getDataAi = async (req, res) => {
  try {
    const { user } = req;
    const { step2, step4, step5 } = user.onboarding;
    let { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      const today = new Date();
      endDate = toYMD(today);
      const d30 = new Date(today);
      d30.setDate(d30.getDate() - 29);
      startDate = toYMD(d30);
    }


  
    const formattedStart = toISTDate(startDate);
    const formattedEnd = toISTDate(endDate);

    // Fetch all in parallel
    const [
      productCostsRes,
      metaDailyRes,
      shiprocketRes,
      shopifyRes,
    ] = await Promise.allSettled([
      getProductCosts(user._id),
      fetchMetaDaily(step4.accessToken, step4.adAccountId, startDate, endDate),
      getShiprocketData(step5.token, startDate, endDate),
      getShopifyData(step2.accessToken, step2.storeUrl, startDate, endDate),
    ]);

    const productCostsMap =
      productCostsRes.status === "fulfilled" ? productCostsRes.value : new Map();

    const metaDaily =
      metaDailyRes.status === "fulfilled" ? metaDailyRes.value : [];
    const metaDailyMap = new Map();
    for (const d of metaDaily) {
      metaDailyMap.set(d.name, d);
    }

    const shiprocketData =
      shiprocketRes.status === "fulfilled"
        ? shiprocketRes.value
        : { dailyShippingSummary: new Map() };

    if (shopifyRes.status === "rejected") {
      throw new Error("Shopify fetch failed");
    }
    const shopifyOrders = shopifyRes.value;

    // Prepare daily data structure
    const dateInterval = eachDayOfInterval({
      start: parseISO(startDate),
      end: parseISO(endDate),
    });

    const dailyData = {};
    dateInterval.forEach((d) => {
      const dayName = toISTLabel(d);
      const dateYMD = format(d, "yyyy-MM-dd");
      const shippingInfo = shiprocketData.dailyShippingSummary.get(dayName) || {
        totalShipments: 0,
        pickupPending: 0,
        inTransit: 0,
        delivered: 0,
        ndrPending: 0,
        rto: 0,
        canceled: 0,
        cod: 0,
        prepaid: 0,
        shippingCost: 0,
      };

      dailyData[dayName] = {
        name: dayName,
        date: dateYMD,
        orders: 0,
        revenue: 0,
        cogs: 0,
        shippingCost: shippingInfo.shippingCost,
        netProfit: 0,
        customers: { new: 0, returning: 0, list: new Set() },
        shippingSummary: shippingInfo,
      };
    });

    // Track first order date for customer classification
    const customerFirstOrderDate = new Map();

    // Process Shopify orders
    for (const order of shopifyOrders) {
      const orderDateObj = new Date(order.createdAt);
      const dayName = toISTLabel(orderDateObj);
      const dayEntry = dailyData[dayName];
      if (!dayEntry) continue;

      // Count orders
      dayEntry.orders = (dayEntry.orders || 0) + 1;

      // Revenue
      const orderRev = parseFloat(order.totalPriceSet?.shopMoney?.amount || 0);
      dayEntry.revenue += orderRev;

      // COGS calculation
      let totalCOGS = 0;
      for (const { node: item } of (order.lineItems?.edges || [])) {
        const pid = item.product?.id;
        if (!pid) continue;
        const costPerProduct = productCostsMap.get(pid) || 0;
        const qty = item.quantity || 0;
        totalCOGS += costPerProduct * qty;
      }
      dayEntry.cogs += totalCOGS;

      // Customer first order
      const cid = order.customer?.id;
      if (cid) {
        if (!customerFirstOrderDate.has(cid))
          customerFirstOrderDate.set(cid, dayName);
        dayEntry.customers.list.add(cid);
      }
    }

    // Classify customers as new/returning
    for (const [cid, firstDay] of customerFirstOrderDate.entries()) {
      for (const d of Object.values(dailyData)) {
        if (d.name === firstDay) {
          d.customers.new++;
        } else if (d.customers.list.has(cid) && d.name !== firstDay) {
          d.customers.returning++;
        }
      }
    }

    // Assign shipping info and calculate total costs & net profit
    Object.values(dailyData).forEach((d) => {
      const metaSpend = metaDailyMap.get(d.name)?.spend || 0;
      d.totalCosts = d.cogs + metaSpend + d.shippingCost;
      d.netProfit = d.revenue - d.totalCosts;
    });

    // Prepare response
    const response = Object.values(dailyData).map((d) => {
      const totalCustomers = d.customers.new + d.customers.returning;
      const returningRate =
        totalCustomers > 0
          ? (d.customers.returning / totalCustomers) * 100
          : 0;
      const avgOrderValue = d.orders ? d.revenue / d.orders : 0;
      return {
        date: d.date,
        summary: [
          { title: "Total Orders", value: d.orders },
          { title: "Revenue", value: formatToINR(d.revenue) },
          { title: "COGS", value: formatToINR(d.cogs) },
          { title: "Shipping Cost", value: formatToINR(d.shippingCost) },
          { title: "Net Profit", value: formatToINR(d.netProfit) },
          { title: "Gross Profit", value: formatToINR(d.revenue - d.cogs) },
          { title: "Avg. Order Value", value: formatToINR(avgOrderValue) },
        ],
        website: [
          { title: "Total Customers", value: totalCustomers },
          { title: "Returning Rate", value: `${returningRate.toFixed(2)}%` },
        ],
        shipping: [
          { title: "Total Shipments", value: d.shippingSummary.totalShipments },
          { title: "Pickup Pending", value: d.shippingSummary.pickupPending },
          { title: "In-Transit", value: d.shippingSummary.inTransit },
          { title: "Delivered", value: d.shippingSummary.delivered },
          { title: "NDR Pending", value: d.shippingSummary.ndrPending },
          { title: "RTO", value: d.shippingSummary.rto },
          { title: "Canceled", value: d.shippingSummary.canceled },
          { title: "COD", value: d.shippingSummary.cod },
          { title: "Prepaid Orders", value: d.shippingSummary.prepaid },
        ],
        marketing: [
          { title: "Spend", value: formatToINR(metaDailyMap.get(d.name)?.spend || 0) },
          { title: "ROAS", value: (metaDailyMap.get(d.name)?.roas || 0).toFixed(2) },
          { title: "Clicks", value: metaDailyMap.get(d.name)?.linkClicks || 0 },
          { title: "CPC", value: formatToINR(metaDailyMap.get(d.name)?.cpc || 0) },
          { title: "CTR", value: `${(metaDailyMap.get(d.name)?.ctr || 0).toFixed(2)}%` },
          { title: "Impressions", value: metaDailyMap.get(d.name)?.impressions || 0 },
          { title: "CPM", value: formatToINR(metaDailyMap.get(d.name)?.cpm || 0) },
          { title: "Reach", value: metaDailyMap.get(d.name)?.reach || 0 },
        ],
      };
    });

    res.status(200).json({ daily: response });
  } catch (err) {
    console.error("AI Data fetch error:", err.message);
    res.status(500).json({
      message: "Failed to fetch AI daily data.",
      error: err.message,
    });
  }
};
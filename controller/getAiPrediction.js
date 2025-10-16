import axios from "axios";
import axiosRetry from "axios-retry";
import NodeCache from "node-cache";
import OpenAI from "openai";
import ProductCost from "../model/ProductCost.js";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
} from "date-fns";

const aiCache = new NodeCache({ stdTTL: 3600 });
const META_API_VERSION = "v23.0";
const SHOPIFY_API_VERSION = "2025-07";

const metaApiClient = axios.create({
  baseURL: `https://graph.facebook.com/${META_API_VERSION}`,
  timeout: 10000,
});
axiosRetry(metaApiClient, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 2000,
  retryCondition: (error) =>
    axiosRetry.isNetworkError(error) || error.response?.status >= 500,
});

const formatToINR = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);

const toYMD = (date) => date.toISOString().split("T")[0];
const toISTDate = (dateStr) => {
  const date = new Date(dateStr);
  const istOffset = 330 * 60 * 1000;
  return new Date(date.getTime() + istOffset).toISOString().split("T")[0];
};
const toNum = (v) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    if (!t || ["n/a", "na", "-"].includes(t)) return 0;
    const n = Number(t.replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};
const monthLabel = (d) => format(d, "LLLL");
const makeSparkline = (arr, points = 7) => {
  if (!arr.length) return Array.from({ length: points }, () => ({ v: 0 }));
  const size = Math.max(1, Math.floor(arr.length / points));
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    const slice = arr.slice(i, i + size);
    out.push({
      v: +(slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(2),
    });
    if (out.length === points) break;
  }
  while (out.length < points) out.push({ v: out[out.length - 1]?.v || 0 });
  return out;
};
const pctChange = (curr, prev) => {
  if (!prev) return { change: "+0.0%", changeType: "increase" };
  const diff = ((curr - prev) / Math.abs(prev)) * 100;
  return {
    change: `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`,
    changeType: diff >= 0 ? "increase" : "decrease",
  };
};

const getProductCosts = async (userId) => {
  try {
    const costData = await ProductCost.findOne({ userId });
    return costData
      ? new Map(costData.products.map((p) => [p.productId, p.cost]))
      : new Map();
  } catch {
    return new Map();
  }
};

const getShopifyOrders = async (apiToken, shopUrl, since, until) => {
  const endpoint = `https://${shopUrl}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  const headers = {
    "X-Shopify-Access-Token": apiToken,
    "Content-Type": "application/json",
  };

  const istStart = `${since}T00:00:00+05:30`;
  const istEnd = `${until}T23:59:59+05:30`;
  const filter = `created_at:>='${istStart}' AND created_at:<='${istEnd}'`;

  const fetchOrders = async (after = null, acc = []) => {
    const query = `
      query($filter: String!, $after: String) {
        orders(first: 250, query: $filter, after: $after) {
          edges {
            node {
              id
              createdAt
              totalPriceSet { shopMoney { amount } }
              lineItems(first: 100) {
                edges { node { quantity product { id } } }
              }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    `;
    try {
      const { data } = await axios.post(
        endpoint,
        { query, variables: { filter, after } },
        { headers }
      );
      const edges = data?.data?.orders?.edges || [];
      acc.push(...edges.map((e) => e.node));
      const pageInfo = data?.data?.orders?.pageInfo;
      return pageInfo?.hasNextPage ? fetchOrders(pageInfo.endCursor, acc) : acc;
    } catch {
      return acc;
    }
  };

  return fetchOrders();
};

const fetchMetaDaily = async (apiToken, adAccountId, since, until) => {
  const params = {
    access_token: apiToken,
    time_range: JSON.stringify({ since, until }),
    fields: "spend",
    time_increment: 1,
  };
  try {
    const { data } = await metaApiClient.get(`/act_${adAccountId}/insights`, {
      params,
    });
    const daily = {};
    (data?.data || []).forEach((ins) => {
      daily[ins.date_start] = { spend: parseFloat(ins.spend || 0) };
    });
    return daily;
  } catch {
    return {};
  }
};

const getShiprocketData = async (apiToken, since, until) => {
  const url = "https://apiv2.shiprocket.in/v1/external/shipments";
  const headers = { Authorization: `Bearer ${apiToken}` };
  const dailyCosts = new Map();
  let totals = { totalShippingCost: 0, totalShipments: 0 };
  let page = 1;

  try {
    const sinceDate = new Date(since);
    const untilDate = new Date(until);
    while (true) {
      const { data } = await axios.get(url, {
        headers,
        params: { per_page: 100, page, sort: "desc", sort_by: "created_at" },
      });
      const rows = data?.data || [];
      if (!rows.length) break;

      rows.forEach((order) => {
        if (!order?.order_date) return;
        const orderDate = new Date(order.order_date);
        if (isNaN(orderDate)) return;
        if (orderDate < sinceDate || orderDate > untilDate) return;

        totals.totalShipments++;
        const ch = order?.charges || {};
        const base = toNum(ch.freight_charges) + toNum(ch.cod_charges);
        const cost = base;
        totals.totalShippingCost += cost;
        const key = toISTDate(orderDate.toISOString());
        dailyCosts.set(key, (dailyCosts.get(key) || 0) + cost);
      });

      if (rows.length < 100) break;
      page++;
    }
  } catch {}
  return { dailyCosts, ...totals };
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const getOpenAiPrediction = async (historicalMonths) => {
  const prompt = `
    You are an expert financial analyst for Indian D2C brands.
    Based on the last 3 months actual data provided, predict the next 3 months.
    Ensure output is valid JSON with root key "predictions".
    Each prediction must have { key, values } where values include:
    revenue, orders, aov, cogs, grossProfit, ads, shipping, netProfit
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "user",
        content:
          prompt +
          "\nHistorical Data:\n" +
          JSON.stringify(historicalMonths, null, 2),
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  const parsed = JSON.parse(content);
  return parsed.predictions.map((p) => ({ ...p, isPrediction: true }));
};

export const getAiPrediction = async (req, res) => {
  try {
    const { user } = req;
    const SHOP = user?.onboarding?.step2?.storeUrl;
    const SHOPIFY_TOKEN = user?.onboarding?.step2?.accessToken;
    const AD_ACCOUNT_ID = user?.onboarding?.step4?.adAccountId;
    const META_TOKEN = user?.onboarding?.step4?.accessToken;
    const SHIPROCKET_TOKEN = user?.onboarding?.step5?.token;

    if (
      !SHOP ||
      !SHOPIFY_TOKEN ||
      !AD_ACCOUNT_ID ||
      !META_TOKEN ||
      !SHIPROCKET_TOKEN
    ) {
      return res
        .status(400)
        .json({ message: "Missing required API credentials." });
    }

    const today = new Date();
    const firstMonthStart = startOfMonth(subMonths(today, 3));
    const lastMonthEnd = endOfMonth(today);
    const allDays = eachDayOfInterval({
      start: firstMonthStart,
      end: lastMonthEnd,
    }).map((d) => toISTDate(d.toISOString()));

    const since = toISTDate(firstMonthStart.toISOString());
    const until = toISTDate(lastMonthEnd.toISOString());

    const [orders, meta, ship, costs] = await Promise.all([
      getShopifyOrders(SHOPIFY_TOKEN, SHOP, since, until),
      fetchMetaDaily(META_TOKEN, AD_ACCOUNT_ID, since, until),
      getShiprocketData(SHIPROCKET_TOKEN, since, until),
      getProductCosts(user._id),
    ]);

    // Daily aggregation
    const daily = {};
    allDays.forEach((d) => {
      daily[d] = {
        revenue: 0,
        orders: 0,
        cogs: 0,
        ads: meta[d]?.spend || 0,
        shipping: ship.dailyCosts.get(d) || 0,
      };
    });

    orders.forEach((o) => {
      const key = toISTDate(parseISO(o.createdAt).toISOString());
      if (!daily[key]) return;
      daily[key].revenue += parseFloat(o.totalPriceSet?.shopMoney?.amount || 0);
      daily[key].orders++;
      let cogs = 0;
      o.lineItems.edges.forEach(({ node }) => {
        const pid = node.product?.id?.split("/").pop();
        cogs += (costs.get(pid) || 0) * (node.quantity || 0);
      });
      daily[key].cogs += cogs;
    });

    Object.values(daily).forEach(
      (d) => (d.aov = d.orders ? d.revenue / d.orders : 0)
    );

    // Aggregate into last 3 months
    const historicalMonths = [];
    for (let i = 3; i >= 1; i--) {
      const monthDate = subMonths(today, i);
      const key = monthLabel(monthDate);
      const days = allDays.filter((d) => isSameMonth(parseISO(d), monthDate));
      const sum = (f) => days.reduce((a, d) => a + (daily[d]?.[f] || 0), 0);
      const revenue = sum("revenue");
      const orders = sum("orders");
      const cogs = sum("cogs");
      const ads = sum("ads");
      const shipping = sum("shipping");
      historicalMonths.push({
        key,
        values: {
          revenue,
          orders,
          aov: orders ? revenue / orders : 0,
          cogs,
          grossProfit: revenue - cogs,
          ads,
          shipping,
          netProfit: revenue - cogs - ads - shipping,
        },
        isPrediction: false,
      });
    }

    // Get predictions
    const predictedMonths = await getOpenAiPrediction(historicalMonths);
    const allMonths = [...historicalMonths, ...predictedMonths];

    // Build frontend response
    const metricsByMonth = {};
    allMonths.forEach((m, idx) => {
      const prev = allMonths[idx - 1];
      const charts = {
        revenue: makeSparkline([m.values.revenue]),
        orders: makeSparkline([m.values.orders]),
        aov: makeSparkline([m.values.aov]),
        cogs: makeSparkline([m.values.cogs]),
        grossProfit: makeSparkline([m.values.grossProfit]),
        otherExpenses: makeSparkline([m.values.ads + m.values.shipping]),
        roas: makeSparkline([
          m.values.ads ? m.values.revenue / m.values.ads : 0,
        ]),
        netProfit: makeSparkline([m.values.netProfit]),
      };
      metricsByMonth[m.key] = [
        {
          title: "Revenue",
          value: formatToINR(m.values.revenue),
          ...pctChange(m.values.revenue, prev?.values.revenue),
          label: "Shopify",
          chartData: charts.revenue,
        },
        {
          title: "Orders",
          value: m.values.orders.toString(),
          ...pctChange(m.values.orders, prev?.values.orders),
          label: "Shopify",
          chartData: charts.orders,
        },
        {
          title: "AOV",
          value: formatToINR(m.values.aov),
          ...pctChange(m.values.aov, prev?.values.aov),
          label: "Shopify",
          chartData: charts.aov,
        },
        {
          title: "COGS",
          value: formatToINR(m.values.cogs),
          ...pctChange(m.values.cogs, prev?.values.cogs),
          label: "Profit First",
          chartData: charts.cogs,
        },
        {
          title: "Gross Profit",
          value: formatToINR(m.values.grossProfit),
          ...pctChange(m.values.grossProfit, prev?.values.grossProfit),
          label: "Profit First",
          chartData: charts.grossProfit,
        },
        {
          title: "Other Expenses",
          value: formatToINR(m.values.ads + m.values.shipping),
          ...pctChange(
            m.values.ads + m.values.shipping,
            prev?.values.ads + prev?.values.shipping
          ),
          label: "Meta+Shipping",
          chartData: charts.otherExpenses,
        },
        {
          title: "ROAS",
          value: m.values.ads
            ? (m.values.revenue / m.values.ads).toFixed(2) + "x"
            : "0x",
          ...pctChange(
            m.values.ads ? m.values.revenue / m.values.ads : 0,
            prev?.values.ads ? prev.values.revenue / prev.values.ads : 0
          ),
          label: "Meta",
          chartData: charts.roas,
        },
        {
          title: "Net Profit",
          value: formatToINR(m.values.netProfit),
          ...pctChange(m.values.netProfit, prev?.values.netProfit),
          label: "Profit First",
          chartData: charts.netProfit,
        },
      ];
    });

    const dashboardData = {
      brand: { name: SHOP.split(".")[0] },
      upcomingEvents: [],
      actionableInsights: ["Focus on AOV growth", "Optimize ROAS"],
      financialBreakdown: allMonths.map((m) => ({
        month: m.key,
        cogs: m.values.cogs,
        grossProfit: m.values.grossProfit,
        operatingCosts: m.values.ads + m.values.shipping,
        netProfit: m.values.netProfit,
        netProfitMargin: m.values.revenue
          ? ((m.values.netProfit / m.values.revenue) * 100).toFixed(1) + "%"
          : "0%",
      })),
    };

    const mainChartsData = {
      Revenue: allMonths.map((m) => ({
        name: m.key,
        Actual: !m.isPrediction ? Math.round(m.values.revenue / 1000) : null,
        Predicted: m.isPrediction ? Math.round(m.values.revenue / 1000) : null,
      })),
      NetProfit: allMonths.map((m) => ({
        name: m.key,
        Actual: !m.isPrediction ? Math.round(m.values.netProfit / 1000) : null,
        Predicted: m.isPrediction
          ? Math.round(m.values.netProfit / 1000)
          : null,
      })),
      COGS: allMonths.map((m) => ({
        name: m.key,
        Actual: !m.isPrediction ? Math.round(m.values.cogs / 1000) : null,
        Predicted: m.isPrediction ? Math.round(m.values.cogs / 1000) : null,
      })),
    };

    return res.json({ metricsByMonth, dashboardData, mainChartsData });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "AI Prediction failed", error: err.message });
  }
};

export default getAiPrediction;

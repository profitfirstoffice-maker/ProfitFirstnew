import axios from "axios";
import moment from "moment";
import NodeCache from "node-cache";

const SHIPROCKET_BASE_URL = "https://apiv2.shiprocket.in/v1/external";
// 10-minute in-memory cache
const cache = new NodeCache({ stdTTL: 600 });

const api = (user) =>
  axios.create({
    baseURL: SHIPROCKET_BASE_URL,
    headers: {
      Authorization: `Bearer ${user.onboarding.step5.token}`,
      "Content-Type": "application/json",
    },
  });

// Fetch all pages for a given endpoint
async function fetchAllPages(endpoint, params = {}, user) {
  let allData = [];
  let url = endpoint;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await api(user).get(url, { params });
    const { data: pageData, meta } = response.data;
    allData = allData.concat(Array.isArray(pageData) ? pageData : []);

    const nextLink = meta?.pagination?.links?.next;
    if (nextLink) {
      url = nextLink;
      params = {};
    } else {
      hasNextPage = false;
    }
  }

  return allData;
}

const monthNames = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec"
];

function mapShipmentStatus(status) {
  const s = (status||"").toUpperCase().trim();
  if (s === "DELIVERED") return "Delivered";
  if (s === "CANCELED") return "Canceled";
  if (s === "RTO" || s === "RTO DELIVERED") return "RTO";
  if (s === "PICKUP PENDING") return "Pickup Pending";
  if (s === "IN TRANSIT") return "In Transit";
  return "Other";
}

function processShipments(shipments) {
  const counts = {};
  shipments.forEach(sh => {
    const status = mapShipmentStatus(sh.status);
    counts[status] = (counts[status]||0) + 1;
  });
  const totalShippingCost = shipments
    .filter(sh => mapShipmentStatus(sh.status) === "Delivered")
    .reduce((sum,sh)=> sum + (Number(sh.charges?.freight_charges)||0), 0);
  return { counts, totalShippingCost };
}

function buildChartData(shipments, opts={}) {
  const nowYear = moment().year();
  const prevYear = nowYear - 1;
  const months = 12;

  const initSeries = () => ({ Shipment: Array(months).fill(0), ShipmentCost: Array(months).fill(0), Delivered: Array(months).fill(0), RTO: Array(months).fill(0) });
  const thisYear = initSeries();
  const lastYear = initSeries();

  shipments.forEach(sh => {
    let date = moment(sh.created_at, "Do MMM YYYY hh:mm A", true);
    if (!date.isValid()) date = moment(sh.created_at);
    if (!date.isValid()) return;
    const y = date.year(), m = date.month();
    const c = Number(sh.charges?.freight_charges)||0;
    const s = mapShipmentStatus(sh.status);
    const target = y===nowYear ? thisYear : y===prevYear ? lastYear : null;
    if (!target) return;
    target.Shipment[m]     ++;
    target.ShipmentCost[m] += c;
    if (s==="Delivered") target.Delivered[m]++;
    if (s==="RTO")       target.RTO[m]++;
  });

  const toSeries = (arr, last=false) => arr.map((v,i)=> ({ name: monthNames[i], value: parseFloat(v.toFixed(2)), ...(last?{ lastValue: parseFloat(v.toFixed(2)) }:{} ) }));

  return {
    chartData: {
      Shipment:     toSeries(thisYear.Shipment),
      ShipmentCost: toSeries(thisYear.ShipmentCost),
      Delivered:    toSeries(thisYear.Delivered),
      RTO:          toSeries(thisYear.RTO),
    },
    lastYearChartData: {
      Shipment:     toSeries(lastYear.Shipment, true),
      ShipmentCost: toSeries(lastYear.ShipmentCost, true),
      Delivered:    toSeries(lastYear.Delivered, true),
      RTO:          toSeries(lastYear.RTO, true),
    }
  };
}

function buildSampleData(orders, shipments) {
  const orderMap = new Map();
  orders.forEach(o => orderMap.set(o.id, { city: o.customer_city, state: o.customer_state, pincode: o.customer_pincode }));
  const locIndex = {};

  shipments.forEach(sh => {
    const meta = orderMap.get(sh.order_id);
    if (!meta) return;
    const s = mapShipmentStatus(sh.status);
    ['state','city','pincode'].forEach(type => {
      const name = meta[type];
      if (!name) return;
      const key = `${type}_${name.trim().toLowerCase()}`;
      if (!locIndex[key]) locIndex[key] = { type, name, totalOrders:0, delivered:0, rto:0 };
      locIndex[key].totalOrders++;
      if (s==='Delivered') locIndex[key].delivered++;
      if (s==='RTO')       locIndex[key].rto++;
    });
  });

  return Object.values(locIndex);
}

export const shipping = async (req, res) => {
  try {
    const user = req.user;
    const { startDate, endDate } = req.query;
    const fromKey = startDate? moment(startDate).format('YYYY-MM-DD') : '';
    const toKey   = endDate?   moment(endDate).format('YYYY-MM-DD')   : '';
    const cacheKey = `shipping|${user.onboarding.step5.token}|${fromKey}|${toKey}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const params = {};
    if (startDate) params.from = fromKey;
    if (endDate)   params.to   = toKey;

    const [orders, shipments, ndrs, statementsRes] = await Promise.all([
      fetchAllPages('/orders', params, user),
      fetchAllPages('/shipments', params, user),
      fetchAllPages('/ndr/all', params, user),
      api(user).get('/account/details/statement')
    ]);

    const accountStatements = Array.isArray(statementsRes.data.data)
      ? statementsRes.data.data : [];

    const { counts, totalShippingCost } = processShipments(shipments);
    const deliveredCount    = counts.Delivered || 0;
    const averageShippingCost = deliveredCount ? totalShippingCost/deliveredCount : 0;

    const codOrders   = orders.filter(o => o.payment_method?.toLowerCase()==='cod');
    const codReceived = codOrders.filter(o => o.payment_status?.toLowerCase()==='received').length;
    const codPending  = codOrders.filter(o => o.payment_status?.toLowerCase()==='pending').length;
    const codAvailable= codOrders.length - codReceived - codPending;
    const lastCodEntry= accountStatements.filter(e => e.type?.toLowerCase().includes('cod remittance'))
      .sort((a,b)=>new Date(b.date)-new Date(a.date))[0];

    const totalNdr     = ndrs.length;
    const ndrPending   = ndrs.filter(n=>n.status==='PENDING').length;
    const ndrDelivered = ndrs.filter(n=>n.status==='DELIVERED').length;
    const possibleNdrStatuses = ["RESOLVED","PENDING","REJECTED","IN PROGRESS","ESCALATED"];
    const ndrStatusCounts = possibleNdrStatuses.reduce((acc,st)=>{ acc[st]=0; return acc; }, {});
    ndrs.forEach(n=>{ const st=(n.status||"").toUpperCase(); if(ndrStatusCounts[st]!=null) ndrStatusCounts[st]++; });
    const ndrStatusData = possibleNdrStatuses.map(name=>({ name: name.charAt(0)+name.slice(1).toLowerCase(), value: ndrStatusCounts[name] }));

    const { chartData, lastYearChartData } = buildChartData(shipments, { singleYear: Boolean(startDate) });
    const sampleData = buildSampleData(orders, shipments);

    const result = {
      summaryData: [
        ["Total Orders", orders.length],
        ["Total Shipments", shipments.length],
        ["Total Shipping Cost", totalShippingCost.toFixed(2)],
        ["Average Shipping Cost", averageShippingCost.toFixed(2)],
        ["Pickup Pending", counts["Pickup Pending"]||0],
        ["In Transit", counts["In Transit"]||0],
        ["Delivered", deliveredCount],
        ["Total NDR", totalNdr],
        ["NDR Pending", ndrPending],
        ["RTO", counts["RTO"]||0]
      ],
      codPaymentStatus: [
        ["Total COD Received", codReceived],
        ["COD Available", codAvailable],
        ["COD Pending", codPending],
        ["Last COD Remitted", lastCodEntry?.date||"N/A"]
      ],
      prepaidCodData: [
        { name: "Prepaid", value: orders.length - codOrders.length },
        { name: "COD",     value: codOrders.length }
      ],
      ndrSummary: [["Total NDR", totalNdr], ["NDR Pending", ndrPending], ["NDR Delivered", ndrDelivered]],
      ndrStatusData,
      chartData,
      lastYearChartData,
      shipmentStatusData: Object.entries(counts).map(([n,v])=>({ name: n, value: v })),
      sampleData
    };

    // Cache result
    cache.set(cacheKey, result);
    return res.json(result);
  } catch (error) {
    console.error("Shipping Controller Error:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }

};

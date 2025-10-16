import axios from 'axios';
import { formatInTimeZone } from 'date-fns-tz';

const IST_TIMEZONE = 'Asia/Kolkata';
const toISTLabel = (date) => formatInTimeZone(date, IST_TIMEZONE, 'MMM d');
const toNum = (v) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const getShiprocketData = async (apiToken, startDate, endDate) => {
  const url = 'https://apiv2.shiprocket.in/v1/external/shipments';
  const headers = { Authorization: `Bearer ${apiToken}` };
  const PER_PAGE = 100;

  let totalShippingCost = 0;
  const dailyShippingCosts = new Map();
  let page = 1, totalShipments = 0, pickupPending = 0, inTransit = 0;
  let delivered = 0, ndrPending = 0, canceled = 0, rto = 0;
  let codOrders = 0, prepaidOrders = 0;

  try {
    while (true) {
      const { data } = await axios.get(url, {
        headers,
        params: { from: startDate, to: endDate, per_page: PER_PAGE, page }
      });

      const rows = data?.data || [];
      if (rows.length === 0) break;

      for (const order of rows) {
        totalShipments++;
        const ch = order.charges || {};
        let cost = toNum(ch.freight_charges) + toNum(ch.cod_charges);
        const status = (order.status || '').toLowerCase();

        if (status.includes('rto')) {
          rto++;
          cost += toNum(ch.charged_weight_amount_rto) || toNum(ch.applied_weight_amount_rto);
        } else if (status.includes('pickup pending')) pickupPending++;
        else if (status.includes('in-transit') || status.includes('in transit')) inTransit++;
        else if (status.includes('ndr')) ndrPending++;
        else if (status.includes('delivered')) delivered++;
        else if (status.includes('cancelled') || status.includes('canceled')) canceled++;

        totalShippingCost += cost;
        if (order.order_date) {
          const key = toISTLabel(order.order_date);
          dailyShippingCosts.set(key, (dailyShippingCosts.get(key) || 0) + cost);
        }

        const pm = (order.payment_method || '').toLowerCase();
        if (pm === 'cod') codOrders++;
        else if (pm === 'prepaid') prepaidOrders++;
      }

      if (rows.length < PER_PAGE) break;
      page++;
    }
  } catch (e) {
    console.error('Shiprocket Error:', e.message);
  }

  return {
    totalShippingCost,
    dailyShippingCosts,
    shipping: [
      { title: 'Total Shipments', value: totalShipments, formula: 'Total orders' },
      { title: 'Pickup Pending', value: pickupPending, formula: 'Orders waiting' },
      { title: 'In-Transit', value: inTransit, formula: 'Parcels moving' },
      { title: 'Delivered', value: delivered, formula: 'Delivered orders' },
      { title: 'NDR Pending', value: ndrPending, formula: 'Non-Delivery Reports' },
      { title: 'RTO', value: rto, formula: 'Return-to-Origin' },
      { title: 'Canceled', value: canceled, formula: 'Canceled orders' },
      { title: 'COD', value: codOrders, formula: 'COD orders' },
      { title: 'Prepaid Orders', value: prepaidOrders, formula: 'Prepaid orders' }
    ]
  };
};

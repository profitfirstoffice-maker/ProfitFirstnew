import axios from 'axios';
import axiosRetry from 'axios-retry';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import ProductCost from '../model/ProductCost.js';
import { getFallbackBusinessData } from './fallbackData.js';

const META_API_VERSION = 'v23.0';
const SHOPIFY_API_VERSION = '2025-07';

const metaApiClient = axios.create({
  baseURL: `https://graph.facebook.com/${META_API_VERSION}`,
  timeout: 15000,
});

axiosRetry(metaApiClient, {
  retries: 3,
  retryDelay: (count) => count * 2000,
  retryCondition: (err) => axiosRetry.isNetworkError(err) || err.response?.status >= 500,
});

class DataAggregator {
  async aggregateAllData(user, startDate, endDate) {
    if (!user?.onboarding) {
      console.warn('⚠️ User onboarding incomplete');
      return getFallbackBusinessData();
    }

    const { step2, step4, step5 } = user.onboarding;

    const [shopifyData, metaData, shiprocketData, productCosts] = await Promise.allSettled([
      this.fetchShopifyData(step2?.accessToken, step2?.storeUrl, startDate, endDate),
      this.fetchMetaData(step4?.accessToken, step4?.adAccountId, startDate, endDate),
      this.fetchShiprocketData(step5?.token, startDate, endDate),
      this.getProductCosts(user._id),
    ]);

    const aggregated = {
      shopify: shopifyData.status === 'fulfilled' ? shopifyData.value : [],
      meta: metaData.status === 'fulfilled' ? metaData.value : [],
      shiprocket: shiprocketData.status === 'fulfilled' ? shiprocketData.value : [],
      productCosts: productCosts.status === 'fulfilled' ? productCosts.value : new Map(),
    };

    // Check if we have any data
    const hasData = aggregated.shopify.length > 0 || aggregated.meta.length > 0 || aggregated.shiprocket.length > 0;
    
    if (!hasData) {
      console.warn('⚠️ No data available from any source');
      return getFallbackBusinessData();
    }

    return this.processAggregatedData(aggregated, startDate, endDate);
  }

  async fetchShopifyData(token, shopUrl, startDate, endDate) {
    if (!token || !shopUrl) {
      console.warn('⚠️ Shopify credentials missing, skipping...');
      return [];
    }

    const endpoint = `https://${shopUrl}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
    const headers = {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    };

    const startISO = new Date(`${startDate}T00:00:00+05:30`).toISOString();
    const endISO = new Date(`${endDate}T23:59:59+05:30`).toISOString();
    const filter = `created_at:>='${startISO}' AND created_at:<='${endISO}'`;

    // Use simple REST API instead of bulk for small date ranges
    const query = `{
      orders(first: 250, query: "${filter.replace(/"/g, '\\"')}") {
        edges {
          node {
            id
            createdAt
            totalPriceSet { shopMoney { amount } }
            lineItems(first: 100) {
              edges {
                node {
                  quantity
                  product { id }
                }
              }
            }
          }
        }
      }
    }`;

    try {
      const { data } = await axios.post(endpoint, { query }, { 
        headers,
        timeout: 15000,
      });
      
      if (data?.errors) {
        console.error('❌ Shopify GraphQL errors:', data.errors);
        return [];
      }
      
      return data?.data?.orders?.edges?.map(e => e.node) || [];
    } catch (error) {
      console.error('❌ Shopify fetch error:', error.message);
      return [];
    }
  }

  async fetchMetaData(token, adAccountId, startDate, endDate) {
    if (!token || !adAccountId) {
      console.warn('⚠️ Meta credentials missing, skipping...');
      return [];
    }

    try {
      const params = {
        access_token: token,
        time_range: JSON.stringify({ since: startDate, until: endDate }),
        fields: 'spend,purchase_roas,clicks,impressions,reach,ctr,cpc,cpm',
        time_increment: 1,
      };

      const { data } = await metaApiClient.get(`/act_${adAccountId}/insights`, { 
        params,
        timeout: 10000,
      });
      return data?.data || [];
    } catch (error) {
      if (error.response?.status === 401) {
        console.error('❌ Meta authentication failed - token may be expired');
      } else {
        console.error('❌ Meta fetch error:', error.message);
      }
      return [];
    }
  }

  async fetchShiprocketData(token, startDate, endDate) {
    if (!token) {
      console.warn('⚠️ Shiprocket token missing, skipping...');
      return [];
    }

    const url = 'https://apiv2.shiprocket.in/v1/external/shipments';
    const headers = { Authorization: `Bearer ${token}` };
    
    try {
      const { data } = await axios.get(url, {
        headers,
        params: { from: startDate, to: endDate, per_page: 100, page: 1 },
        timeout: 10000,
      });
      return data?.data || [];
    } catch (error) {
      if (error.response?.status === 401) {
        console.error('❌ Shiprocket authentication failed - token may be expired');
      } else {
        console.error('❌ Shiprocket fetch error:', error.message);
      }
      return [];
    }
  }

  async getProductCosts(userId) {
    try {
      const costData = await ProductCost.findOne({ userId });
      return costData ? new Map(costData.products.map(p => [p.productId, p.cost])) : new Map();
    } catch {
      return new Map();
    }
  }

  processAggregatedData(data, startDate, endDate) {
    const { shopify, meta, shiprocket, productCosts } = data;

    console.log('\n📊 Processing Aggregated Data...');
    console.log(`   Shopify orders: ${shopify.length}`);
    console.log(`   Meta insights: ${meta.length}`);
    console.log(`   Shiprocket shipments: ${shiprocket.length}`);
    console.log(`   Product costs loaded: ${productCosts.size}`);

    let totalRevenue = 0;
    let totalOrders = shopify.length || 0;
    let totalCOGS = 0;
    let totalAdSpend = 0;
    let totalShippingCost = 0;

    // Process Shopify orders
    shopify.forEach(order => {
      const revenue = parseFloat(order.totalPriceSet?.shopMoney?.amount || 0);
      totalRevenue += revenue;

      order.lineItems?.edges?.forEach(({ node }) => {
        const pid = node.product?.id;
        const cost = productCosts.get(pid) || 0;
        const quantity = node.quantity || 0;
        const itemCOGS = cost * quantity;
        totalCOGS += itemCOGS;
      });
    });

    // Process Meta data
    meta.forEach(insight => {
      const spend = parseFloat(insight.spend || 0);
      totalAdSpend += spend;
    });

    // Process Shiprocket data
    shiprocket.forEach(shipment => {
      const charges = shipment.charges || {};
      const freight = parseFloat(charges.freight_charges || 0);
      const cod = parseFloat(charges.cod_charges || 0);
      totalShippingCost += freight + cod;
    });

    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalAdSpend - totalShippingCost;
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const roas = totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0;

    console.log('\n💰 Calculated Metrics:');
    console.log(`   Revenue: ₹${totalRevenue.toLocaleString('en-IN')}`);
    console.log(`   Orders: ${totalOrders}`);
    console.log(`   COGS: ₹${totalCOGS.toLocaleString('en-IN')}`);
    console.log(`   Gross Profit: ₹${grossProfit.toLocaleString('en-IN')} (Revenue - COGS)`);
    console.log(`   Ad Spend: ₹${totalAdSpend.toLocaleString('en-IN')}`);
    console.log(`   Shipping Cost: ₹${totalShippingCost.toLocaleString('en-IN')}`);
    console.log(`   Net Profit: ₹${netProfit.toLocaleString('en-IN')} (Gross - Ads - Shipping)`);
    console.log(`   ROAS: ${roas.toFixed(2)}x`);
    console.log(`   AOV: ₹${aov.toFixed(2)}\n`);

    const result = {
      revenue: totalRevenue,
      orders: totalOrders,
      aov,
      cogs: totalCOGS,
      grossProfit,
      adSpend: totalAdSpend,
      shippingCost: totalShippingCost,
      netProfit,
      roas,
      totalShipments: shiprocket.length,
      delivered: shiprocket.filter(s => s.status?.toLowerCase().includes('delivered')).length,
      inTransit: shiprocket.filter(s => s.status?.toLowerCase().includes('in-transit')).length,
      rto: shiprocket.filter(s => s.status?.toLowerCase().includes('rto')).length,
      ndr: shiprocket.filter(s => s.status?.toLowerCase().includes('ndr')).length,
    };

    console.log('✅ Data aggregation complete\n');
    return result;
  }
}

export default new DataAggregator();

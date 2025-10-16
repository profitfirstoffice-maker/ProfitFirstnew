/**
 * Dashboard Data Extractor
 * Extracts business metrics from dashboard response
 * Ensures AI uses EXACT same data as dashboard
 */

import { dashboard } from '../controller/profitfirst/dashboard.js';

/**
 * Get dashboard data for a user
 */
export async function getDashboardData(user, startDate, endDate) {
  // Create a mock request/response to call dashboard controller
  const mockReq = {
    user,
    query: { startDate, endDate }
  };

  let dashboardData = null;

  const mockRes = {
    status: (code) => ({
      json: (data) => {
        dashboardData = data;
        return mockRes;
      }
    })
  };

  try {
    await dashboard(mockReq, mockRes);
    return dashboardData;
  } catch (error) {
    console.error('❌ Error fetching dashboard data:', error.message);
    return null;
  }
}

/**
 * Extract business metrics from dashboard response
 */
export function extractMetricsFromDashboard(dashboardData) {
  if (!dashboardData || !dashboardData.summary) {
    return {
      revenue: 0,
      orders: 0,
      aov: 0,
      cogs: 0,
      grossProfit: 0,
      adSpend: 0,
      shippingCost: 0,
      netProfit: 0,
      roas: 0,
    };
  }

  const summary = dashboardData.summary;
  
  // Helper to extract value from summary
  const getValue = (title) => {
    const item = summary.find(s => s.title === title);
    if (!item) return 0;
    
    const value = item.value;
    
    // If it's a string with ₹, remove it and parse
    if (typeof value === 'string') {
      const cleaned = value.replace(/[₹,]/g, '').replace(/%/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    
    return typeof value === 'number' ? value : 0;
  };

  const revenue = getValue('Revenue');
  const orders = getValue('Total Orders');
  const cogs = getValue('COGS');
  const grossProfit = getValue('Gross Profit');
  const adSpend = getValue('Ads Spend');
  const shippingCost = getValue('Shipping Cost');
  const netProfit = getValue('Net Profit');
  const roas = getValue('ROAS');
  const aov = getValue('Avg. Order Value');

  console.log('\n📊 Extracted from Dashboard:');
  console.log(`   Revenue: ₹${revenue.toLocaleString('en-IN')}`);
  console.log(`   Orders: ${orders}`);
  console.log(`   COGS: ₹${cogs.toLocaleString('en-IN')}`);
  console.log(`   Gross Profit: ₹${grossProfit.toLocaleString('en-IN')}`);
  console.log(`   Ad Spend: ₹${adSpend.toLocaleString('en-IN')}`);
  console.log(`   Shipping Cost: ₹${shippingCost.toLocaleString('en-IN')}`);
  console.log(`   Net Profit: ₹${netProfit.toLocaleString('en-IN')}`);
  console.log(`   ROAS: ${roas}x`);
  console.log(`   AOV: ₹${aov.toLocaleString('en-IN')}\n`);

  return {
    revenue,
    orders,
    aov,
    cogs,
    grossProfit,
    adSpend,
    shippingCost,
    netProfit,
    roas,
    // Add shipping details if available
    totalShipments: dashboardData.shipping?.length || 0,
    delivered: dashboardData.shipping?.filter(s => s.status?.toLowerCase().includes('delivered')).length || 0,
    inTransit: dashboardData.shipping?.filter(s => s.status?.toLowerCase().includes('in-transit')).length || 0,
    rto: dashboardData.shipping?.filter(s => s.status?.toLowerCase().includes('rto')).length || 0,
    ndr: dashboardData.shipping?.filter(s => s.status?.toLowerCase().includes('ndr')).length || 0,
  };
}

export default {
  getDashboardData,
  extractMetricsFromDashboard,
};

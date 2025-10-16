/**
 * Fallback data service for when external APIs fail
 * Provides graceful degradation without breaking the application
 */

export const getFallbackBusinessData = () => ({
  revenue: 0,
  orders: 0,
  aov: 0,
  cogs: 0,
  grossProfit: 0,
  adSpend: 0,
  shippingCost: 0,
  netProfit: 0,
  roas: 0,
  totalShipments: 0,
  delivered: 0,
  inTransit: 0,
  rto: 0,
  ndr: 0,
  note: 'Data temporarily unavailable. Please check your API credentials.',
});

export const validateApiCredentials = (user) => {
  const issues = [];
  
  if (!user?.onboarding?.step2?.accessToken || !user?.onboarding?.step2?.storeUrl) {
    issues.push('Shopify credentials missing or invalid');
  }
  
  if (!user?.onboarding?.step4?.accessToken || !user?.onboarding?.step4?.adAccountId) {
    issues.push('Meta Ads credentials missing or invalid');
  }
  
  if (!user?.onboarding?.step5?.token) {
    issues.push('Shiprocket token missing or invalid');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
  };
};

export const getApiHealthStatus = async (user) => {
  const status = {
    shopify: 'unknown',
    meta: 'unknown',
    shiprocket: 'unknown',
  };

  // Quick health checks could be added here
  // For now, just check if credentials exist
  
  if (user?.onboarding?.step2?.accessToken) {
    status.shopify = 'configured';
  }
  
  if (user?.onboarding?.step4?.accessToken) {
    status.meta = 'configured';
  }
  
  if (user?.onboarding?.step5?.token) {
    status.shiprocket = 'configured';
  }

  return status;
};

export default {
  getFallbackBusinessData,
  validateApiCredentials,
  getApiHealthStatus,
};

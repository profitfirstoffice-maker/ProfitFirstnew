/**
 * Prediction Service
 * Provides advanced forecasting and trend analysis
 */

class PredictionService {
  /**
   * Calculate revenue projections
   */
  projectRevenue(businessData, days = 30) {
    const dailyAverage = businessData.revenue / 30;
    
    return {
      daily: dailyAverage,
      weekly: dailyAverage * 7,
      monthly: dailyAverage * 30,
      quarterly: dailyAverage * 90,
      yearly: dailyAverage * 365,
    };
  }

  /**
   * Calculate profit projections
   */
  projectProfit(businessData, days = 30) {
    const profitMargin = businessData.revenue > 0 
      ? businessData.netProfit / businessData.revenue 
      : 0;
    
    const projections = this.projectRevenue(businessData, days);
    
    return {
      daily: projections.daily * profitMargin,
      weekly: projections.weekly * profitMargin,
      monthly: projections.monthly * profitMargin,
      quarterly: projections.quarterly * profitMargin,
      yearly: projections.yearly * profitMargin,
      margin: profitMargin * 100,
    };
  }

  /**
   * Calculate time to reach revenue goal
   */
  timeToReachGoal(businessData, goalRevenue) {
    const dailyAverage = businessData.revenue / 30;
    
    if (dailyAverage === 0) {
      return { days: Infinity, months: Infinity, achievable: false };
    }
    
    const daysNeeded = goalRevenue / dailyAverage;
    const monthsNeeded = daysNeeded / 30;
    
    return {
      days: Math.ceil(daysNeeded),
      months: monthsNeeded.toFixed(1),
      achievable: true,
      dailyRequired: dailyAverage,
    };
  }

  /**
   * Calculate growth rate needed to reach goal
   */
  growthRateNeeded(currentRevenue, goalRevenue, months = 1) {
    const growthNeeded = ((goalRevenue - currentRevenue) / currentRevenue) * 100;
    const monthlyGrowthRate = growthNeeded / months;
    
    return {
      totalGrowth: growthNeeded.toFixed(1),
      monthlyGrowth: monthlyGrowthRate.toFixed(1),
      achievable: monthlyGrowthRate < 50, // More than 50% monthly growth is very difficult
    };
  }

  /**
   * Analyze trends (improving, stable, declining)
   */
  analyzeTrend(businessData) {
    const profitMargin = businessData.revenue > 0 
      ? (businessData.netProfit / businessData.revenue) * 100 
      : 0;
    
    const rtoRate = businessData.totalShipments > 0
      ? (businessData.rto / businessData.totalShipments) * 100
      : 0;
    
    const deliveryRate = businessData.totalShipments > 0
      ? (businessData.delivered / businessData.totalShipments) * 100
      : 0;

    return {
      profitMargin: {
        value: profitMargin.toFixed(1),
        status: profitMargin > 30 ? 'excellent' : profitMargin > 20 ? 'good' : profitMargin > 10 ? 'fair' : 'poor',
      },
      roas: {
        value: businessData.roas?.toFixed(2) || 0,
        status: businessData.roas > 5 ? 'excellent' : businessData.roas > 3 ? 'good' : businessData.roas > 2 ? 'fair' : 'poor',
      },
      rtoRate: {
        value: rtoRate.toFixed(1),
        status: rtoRate < 2 ? 'excellent' : rtoRate < 5 ? 'good' : rtoRate < 10 ? 'fair' : 'poor',
      },
      deliveryRate: {
        value: deliveryRate.toFixed(1),
        status: deliveryRate > 95 ? 'excellent' : deliveryRate > 90 ? 'good' : deliveryRate > 85 ? 'fair' : 'poor',
      },
    };
  }

  /**
   * Calculate break-even analysis
   */
  breakEvenAnalysis(businessData) {
    const fixedCosts = businessData.adSpend + businessData.shippingCost;
    const variableCostPerOrder = businessData.orders > 0 
      ? businessData.cogs / businessData.orders 
      : 0;
    
    const revenuePerOrder = businessData.orders > 0 
      ? businessData.revenue / businessData.orders 
      : 0;
    
    const contributionMargin = revenuePerOrder - variableCostPerOrder;
    
    const breakEvenOrders = contributionMargin > 0 
      ? Math.ceil(fixedCosts / contributionMargin) 
      : Infinity;
    
    const breakEvenRevenue = breakEvenOrders * revenuePerOrder;
    
    const currentOrdersAboveBreakeven = businessData.orders - breakEvenOrders;
    
    return {
      breakEvenOrders,
      breakEvenRevenue,
      currentOrders: businessData.orders,
      ordersAboveBreakeven: currentOrdersAboveBreakeven,
      isBreakEven: currentOrdersAboveBreakeven > 0,
      contributionMargin,
    };
  }

  /**
   * Optimize ad spend recommendation
   */
  optimizeAdSpend(businessData) {
    const currentROAS = businessData.roas || 0;
    const currentAdSpend = businessData.adSpend || 0;
    const currentRevenue = businessData.revenue || 0;
    
    // If ROAS > 5, can increase ad spend
    if (currentROAS > 5) {
      const recommendedIncrease = currentAdSpend * 0.2; // 20% increase
      const projectedRevenue = currentRevenue + (recommendedIncrease * currentROAS);
      const projectedProfit = (projectedRevenue - businessData.cogs - (currentAdSpend + recommendedIncrease) - businessData.shippingCost);
      
      return {
        recommendation: 'increase',
        amount: recommendedIncrease,
        projectedRevenue,
        projectedProfit,
        reason: `Your ROAS of ${currentROAS.toFixed(2)}x is excellent. Increasing ad spend by ₹${recommendedIncrease.toLocaleString('en-IN')} could generate ₹${(recommendedIncrease * currentROAS).toLocaleString('en-IN')} more revenue.`,
      };
    }
    
    // If ROAS < 2, should decrease ad spend
    if (currentROAS < 2) {
      const recommendedDecrease = currentAdSpend * 0.3; // 30% decrease
      const lostRevenue = recommendedDecrease * currentROAS;
      const savedCost = recommendedDecrease;
      const netBenefit = savedCost - lostRevenue;
      
      return {
        recommendation: 'decrease',
        amount: recommendedDecrease,
        lostRevenue,
        savedCost,
        netBenefit,
        reason: `Your ROAS of ${currentROAS.toFixed(2)}x is low. Reducing ad spend by ₹${recommendedDecrease.toLocaleString('en-IN')} will save more than the revenue lost.`,
      };
    }
    
    // ROAS between 2-5, maintain current spend
    return {
      recommendation: 'maintain',
      reason: `Your ROAS of ${currentROAS.toFixed(2)}x is good. Maintain current ad spend and focus on optimizing campaigns.`,
    };
  }

  /**
   * Calculate AOV improvement impact
   */
  aovImpactAnalysis(businessData, targetAOV) {
    const currentAOV = businessData.aov || 0;
    const currentOrders = businessData.orders || 0;
    
    const aovIncrease = targetAOV - currentAOV;
    const revenueIncrease = aovIncrease * currentOrders;
    const profitMargin = businessData.revenue > 0 
      ? businessData.netProfit / businessData.revenue 
      : 0;
    const profitIncrease = revenueIncrease * profitMargin;
    
    return {
      currentAOV,
      targetAOV,
      aovIncrease,
      revenueIncrease,
      profitIncrease,
      percentageIncrease: ((aovIncrease / currentAOV) * 100).toFixed(1),
    };
  }

  /**
   * RTO reduction impact
   */
  rtoReductionImpact(businessData, targetRTORate) {
    const currentRTORate = businessData.totalShipments > 0
      ? (businessData.rto / businessData.totalShipments) * 100
      : 0;
    
    const currentRTO = businessData.rto || 0;
    const targetRTO = Math.ceil((targetRTORate / 100) * businessData.totalShipments);
    const rtoReduction = currentRTO - targetRTO;
    
    // Assume average shipping cost per RTO is 2x normal shipping
    const avgShippingCost = businessData.totalShipments > 0
      ? businessData.shippingCost / businessData.totalShipments
      : 0;
    const rtoCost = avgShippingCost * 2;
    const savingsFromRTOReduction = rtoReduction * rtoCost;
    
    return {
      currentRTORate: currentRTORate.toFixed(1),
      targetRTORate: targetRTORate.toFixed(1),
      currentRTO,
      targetRTO,
      rtoReduction,
      monthlySavings: savingsFromRTOReduction,
      yearlySavings: savingsFromRTOReduction * 12,
    };
  }

  /**
   * Generate comprehensive forecast
   */
  generateForecast(businessData) {
    return {
      revenue: this.projectRevenue(businessData),
      profit: this.projectProfit(businessData),
      trends: this.analyzeTrend(businessData),
      breakEven: this.breakEvenAnalysis(businessData),
      adSpendOptimization: this.optimizeAdSpend(businessData),
    };
  }
}

export default new PredictionService();

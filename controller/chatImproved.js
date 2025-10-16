import aiOrchestrator from '../services/aiOrchestrator.js';
import vectorStore from '../services/vectorStore.js';
import dataAggregator from '../services/dataAggregator.js';
import { getDashboardData, extractMetricsFromDashboard } from '../services/dashboardDataExtractor.js';
import { format, subDays } from 'date-fns';

/**
 * Initialize chat with business context
 */
export async function initializeChatController(req, res) {
  try {
    const { user } = req;
    const userId = user._id.toString();

    // Get last 30 days of data
    const endDate = format(new Date(), 'yyyy-MM-dd');
    const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');

    // Aggregate all business data with error handling
    let businessData = {};
    try {
      businessData = await dataAggregator.aggregateAllData(user, startDate, endDate);
    } catch (dataError) {
      console.warn('⚠️ Could not fetch all business data during init:', dataError.message);
      businessData = {
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

    // Store in vector database for context (optional, continue if fails)
    try {
      await vectorStore.storeBusinessContext(userId, {
        brandName: user.onboarding?.step2?.storeUrl?.split('.')[0] || 'Your Brand',
        ...businessData,
        totalCustomers: businessData.orders,
        newCustomers: Math.floor(businessData.orders * 0.3),
        returningCustomers: Math.floor(businessData.orders * 0.7),
        returningRate: 70,
      });
    } catch (vectorError) {
      console.warn('⚠️ Could not store in vector database:', vectorError.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Chat initialized',
      sessionId: userId,
      dataRange: { startDate, endDate },
    });
  } catch (error) {
    console.error('❌ Initialize chat error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to initialize chat',
      message: error.message,
    });
  }
}

/**
 * Send message and get AI response
 */
export async function sendChatMessageController(req, res) {
  try {
    const { user } = req;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid message',
      });
    }

    const userId = user._id.toString();

    // Get REAL-TIME business data (last 30 days)
    // 🔥 IMPORTANT: Use SAME data as dashboard to ensure consistency
    const endDate = format(new Date(), 'yyyy-MM-dd');
    const startDate = format(subDays(new Date(), 29), 'yyyy-MM-dd'); // Last 30 days including today
    
    let businessData = {};
    let dataAvailable = true;
    
    try {
      console.log(`📊 Fetching data from dashboard for ${startDate} to ${endDate}`);
      
      // Get data from dashboard (same source as frontend sees)
      const dashboardData = await getDashboardData(user, startDate, endDate);
      
      if (dashboardData) {
        // Extract metrics from dashboard response
        businessData = extractMetricsFromDashboard(dashboardData);
        
        // Add metadata about data freshness
        businessData.dataRange = {
          startDate,
          endDate,
          daysIncluded: 30,
          isRealTime: true,
        };
        
        // Check if we have meaningful data
        if (businessData.orders === 0 && businessData.revenue === 0) {
          dataAvailable = false;
        } else {
          console.log(`✅ Dashboard data loaded: ${businessData.orders} orders, ₹${businessData.revenue.toLocaleString('en-IN')} revenue`);
          console.log(`✅ Gross Profit: ₹${businessData.grossProfit.toLocaleString('en-IN')}`);
        }
      } else {
        throw new Error('Dashboard data not available');
      }
    } catch (dataError) {
      console.warn('⚠️ Could not fetch dashboard data, falling back to dataAggregator:', dataError.message);
      
      // Fallback to dataAggregator if dashboard fails
      try {
        businessData = await dataAggregator.aggregateAllData(user, startDate, endDate);
        businessData.dataRange = {
          startDate,
          endDate,
          daysIncluded: 30,
          isRealTime: true,
        };
        
        if (businessData.orders === 0 && businessData.revenue === 0) {
          dataAvailable = false;
        }
      } catch (fallbackError) {
        console.error('❌ Both dashboard and dataAggregator failed:', fallbackError.message);
        dataAvailable = false;
        businessData = {
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
    }

    // If no data available, return helpful message
    if (!dataAvailable) {
      return res.status(200).json({
        success: true,
        reply: `I'm currently unable to access your business data. This could be due to:\n\n1. API rate limiting (please wait a moment and try again)\n2. Expired API credentials\n3. No orders in the selected date range\n\nPlease check your API connections in Settings or try again in a few moments.`,
        metadata: {
          queryType: 'error',
          contextUsed: 0,
          timestamp: new Date().toISOString(),
          dataAvailable: false,
        },
      });
    }

    // Log the data being sent to AI for debugging
    console.log('📊 Data sent to AI:', {
      revenue: businessData.revenue,
      orders: businessData.orders,
      grossProfit: businessData.grossProfit,
      netProfit: businessData.netProfit,
      cogs: businessData.cogs,
      adSpend: businessData.adSpend,
      shippingCost: businessData.shippingCost,
      roas: businessData.roas,
      aov: businessData.aov,
    });

    // Process query through AI orchestrator with REAL-TIME data
    const result = await aiOrchestrator.processQuery(userId, message.trim(), businessData);

    if (!result.success) {
      return res.status(200).json({
        success: true,
        reply: 'I apologize, but I encountered an error processing your query. Please try rephrasing your question or try again in a moment.',
        metadata: {
          queryType: 'error',
          contextUsed: 0,
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    console.log('💬 AI Response:', result.response);

    return res.status(200).json({
      success: true,
      reply: result.response,
      metadata: {
        queryType: result.analysis?.type,
        contextUsed: result.contextUsed,
        timestamp: new Date().toISOString(),
        dataRange: businessData.dataRange,
        dataAvailable: true,
      },
    });
  } catch (error) {
    console.error('❌ Send message error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to send message',
      message: error.message,
    });
  }
}

/**
 * Get business insights
 */
export async function getBusinessInsightsController(req, res) {
  try {
    const { user } = req;
    const userId = user._id.toString();

    const endDate = format(new Date(), 'yyyy-MM-dd');
    const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const businessData = await dataAggregator.aggregateAllData(user, startDate, endDate);

    // Generate insights using AI
    const insights = await aiOrchestrator.processQuery(
      userId,
      'Provide top 5 actionable insights based on my current business performance',
      businessData
    );

    return res.status(200).json({
      success: true,
      insights: insights.response,
      metrics: businessData,
    });
  } catch (error) {
    console.error('❌ Get insights error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to get insights',
      message: error.message,
    });
  }
}

export default {
  initializeChatController,
  sendChatMessageController,
  getBusinessInsightsController,
};

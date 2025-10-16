import aiOrchestrator from '../services/aiOrchestrator.js';

/**
 * Test chat endpoint - No authentication required
 * Uses demo/fallback data for testing AI responses
 */
export async function testChatController(req, res) {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid message',
      });
    }

    // Use demo data for testing
    const businessData = {
      revenue: 4786863,
      orders: 2918,
      aov: 1640,
      cogs: 1941685,
      grossProfit: 2845178,
      adSpend: 619800,
      shippingCost: 447279,
      netProfit: 1778099,
      roas: 7.72,
      totalShipments: 2918,
      delivered: 2627,
      inTransit: 145,
      rto: 146,
      ndr: 0,
    };
    
    console.log('🧪 Test Chat - Question:', message);
    console.log('📊 Using demo data:', {
      revenue: businessData.revenue,
      orders: businessData.orders,
      grossProfit: businessData.grossProfit,
      netProfit: businessData.netProfit,
    });

    // Process query through AI orchestrator
    const result = await aiOrchestrator.processQuery(
      'test-user',
      message.trim(),
      businessData
    );

    if (!result.success) {
      return res.status(200).json({
        success: false,
        response: 'Error processing query',
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      response: result.response,
      dataUsed: {
        revenue: businessData.revenue,
        orders: businessData.orders,
        grossProfit: businessData.grossProfit,
        netProfit: businessData.netProfit,
        cogs: businessData.cogs,
        adSpend: businessData.adSpend,
        roas: businessData.roas,
        aov: businessData.aov,
      },
      context: {
        currentMetrics: true,
        historicalData: true,
        predictions: true,
        trends: true,
      },
    });
  } catch (error) {
    console.error('❌ Test chat error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      response: 'I apologize, but I encountered an error. Please try again.',
    });
  }
}

export default { testChatController };

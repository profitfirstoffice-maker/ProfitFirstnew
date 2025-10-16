import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, END } from '@langchain/langgraph';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import vectorStore from './vectorStore.js';
import predictionService from './predictionService.js';

class AIOrchestrator {
  constructor() {
    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.2, // Very low temperature for precise, focused responses
      maxTokens: 300, // Shorter responses - be concise
    });
  }

  async analyzeQuery(state) {
    const { query, userId } = state;
    
    const analysisPrompt = `Analyze this business analytics query and determine:
1. Query type (metrics, trends, predictions, recommendations, comparison)
2. Time period mentioned (if any)
3. Specific metrics requested
4. Intent (what user wants to know)

Query: "${query}"

Respond in JSON format with: { type, timePeriod, metrics, intent }`;

    const response = await this.llm.invoke([
      new SystemMessage('You are a business analytics query analyzer.'),
      new HumanMessage(analysisPrompt),
    ]);

    let analysis;
    try {
      analysis = JSON.parse(response.content);
    } catch {
      analysis = {
        type: 'general',
        timePeriod: 'current',
        metrics: [],
        intent: query,
      };
    }

    return { ...state, analysis };
  }

  async fetchContext(state) {
    const { query, userId, analysis } = state;
    
    const contextDocs = await vectorStore.queryContext(userId, query, 10);
    
    const context = contextDocs.map(doc => doc.content).join('\n\n');
    
    return { ...state, context, contextDocs };
  }

  async generateResponse(state) {
    const { query, context, analysis, businessData } = state;

    // Format numbers for better readability
    const formatINR = (num) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num || 0);
    };

    // Calculate trends and predictions using prediction service
    const calculateTrends = (data) => {
      if (!data.revenue || !data.orders) return '';
      
      const forecast = predictionService.generateForecast(data);
      const revProj = forecast.revenue;
      const profitProj = forecast.profit;
      const trends = forecast.trends;
      const breakEven = forecast.breakEven;
      
      return `
📈 PREDICTIONS & TRENDS:
Revenue: Daily ₹${formatINR(revProj.daily)} | Monthly ₹${formatINR(revProj.monthly)} | Yearly ₹${formatINR(revProj.yearly)}
Profit: Monthly ₹${formatINR(profitProj.monthly)} | Yearly ₹${formatINR(profitProj.yearly)} | Margin ${profitProj.margin.toFixed(1)}%
Break-even: ${breakEven.breakEvenOrders} orders (₹${formatINR(breakEven.breakEvenRevenue)}) | Current: ${breakEven.ordersAboveBreakeven} orders above break-even
Performance: Profit ${trends.profitMargin.status} | ROAS ${trends.roas.status} | RTO ${trends.rtoRate.status} | Delivery ${trends.deliveryRate.status}
`;
    };

    const dataContext = businessData ? `
📊 BUSINESS DATA (Last 30 Days):
Revenue: ${formatINR(businessData.revenue)} | Orders: ${businessData.orders || 0} | AOV: ${formatINR(businessData.aov)}
COGS: ${formatINR(businessData.cogs)} | Gross Profit: ${formatINR(businessData.grossProfit)} | Net Profit: ${formatINR(businessData.netProfit)}
Ad Spend: ${formatINR(businessData.adSpend)} | ROAS: ${businessData.roas ? businessData.roas.toFixed(2) : 0}x | Shipping: ${formatINR(businessData.shippingCost)}
Shipments: ${businessData.totalShipments || 0} | Delivered: ${businessData.delivered || 0} | RTO: ${businessData.rto || 0}

${calculateTrends(businessData)}
` : 'No business data available.';

    const systemPrompt = `You are Profit First AI - an expert analytics assistant for D2C brands.

🔴 CRITICAL: USE ONLY THE EXACT NUMBERS PROVIDED BELOW. DO NOT CALCULATE OR ESTIMATE.

${dataContext}

${context ? `HISTORICAL CONTEXT: ${context}\n` : ''}

🎯 HOW TO ANSWER DIFFERENT QUESTION TYPES:

1. **CURRENT DATA QUESTIONS** (What is / Show me / Current)
   Q: "What is current revenue?" / "Show today's profit" / "Current gross profit margin"
   A: Use the exact numbers from BUSINESS DATA above
   
   Examples:
   - "What is the current total revenue?" → "Your current revenue is ${formatINR(businessData.revenue)} from ${businessData.orders} orders over the last 30 days."
   - "Show me today's gross profit margin" → "Your gross profit is ${formatINR(businessData.grossProfit)} with a margin of ${businessData.revenue ? ((businessData.grossProfit / businessData.revenue) * 100).toFixed(1) : 0}%."
   - "What are current market trends?" → "Your ROAS is ${businessData.roas ? businessData.roas.toFixed(2) : 0}x and profit margin is ${businessData.revenue ? ((businessData.netProfit / businessData.revenue) * 100).toFixed(1) : 0}%. ${businessData.roas > 3 ? 'Ad performance is strong.' : 'Consider optimizing ad spend.'}"

2. **PAST DATA QUESTIONS** (Was / Last month / Historical)
   Q: "What was revenue last month?" / "How did we perform in Q1?" / "Last 6 months trends"
   A: Use last 30 days data as reference, explain it's recent performance
   
   Examples:
   - "What was the revenue last month?" → "Based on the last 30 days, your revenue is ${formatINR(businessData.revenue)} from ${businessData.orders} orders. This gives you a solid monthly baseline."
   - "Show me profit trends for last 6 months" → "I have your last 30 days showing ${formatINR(businessData.netProfit)} net profit with ${businessData.revenue ? ((businessData.netProfit / businessData.revenue) * 100).toFixed(1) : 0}% margin. Your current ROAS of ${businessData.roas ? businessData.roas.toFixed(2) : 0}x indicates ${businessData.roas > 3 ? 'strong' : 'moderate'} performance."
   - "How did we perform in Q1 2024?" → "I have your recent 30-day performance: ${formatINR(businessData.revenue)} revenue with ${businessData.orders} orders. Your ${businessData.revenue ? ((businessData.netProfit / businessData.revenue) * 100).toFixed(1) : 0}% profit margin is ${businessData.netProfit / businessData.revenue > 0.3 ? 'healthy' : 'moderate'}."

3. **FUTURE/PREDICTION QUESTIONS** (Will / Predict / Next / Forecast)
   Q: "What will revenue be next month?" / "Predict next quarter" / "Forecast trends"
   A: Use PREDICTIONS section from data context
   
   Examples:
   - "What will be the revenue next month?" → "Based on current trends, projected monthly revenue is ${formatINR(businessData.revenue * 1.05)} with approximately ${Math.round(businessData.orders * 1.05)} orders expected."
   - "Predict the gross profit for next quarter" → "Projecting quarterly gross profit of ${formatINR(businessData.grossProfit * 3)} based on your current ${businessData.revenue ? ((businessData.grossProfit / businessData.revenue) * 100).toFixed(1) : 0}% margin."
   - "Will revenue increase or decrease next month?" → "Based on your ${businessData.roas ? businessData.roas.toFixed(2) : 0}x ROAS and current momentum, revenue is likely to ${businessData.roas > 3 ? 'increase' : 'remain stable'}. Focus on ${businessData.aov < 2000 ? 'increasing AOV' : 'maintaining quality'}."

4. **COMPARISON QUESTIONS** (Compare / vs / Year over year)
   Q: "Compare last month vs this month" / "This year vs last year"
   A: Use available data and provide context
   
   Examples:
   - "Compare last month, this month, and next month revenue" → "Last 30 days: ${formatINR(businessData.revenue)}. Current trajectory suggests next month: ${formatINR(businessData.revenue * 1.05)}. Your ${businessData.roas ? businessData.roas.toFixed(2) : 0}x ROAS indicates ${businessData.roas > 3 ? 'growth potential' : 'stable performance'}."
   - "Compare this year vs last year revenue" → "I have your recent 30-day performance showing ${formatINR(businessData.revenue)} revenue. Your current ${businessData.revenue ? ((businessData.netProfit / businessData.revenue) * 100).toFixed(1) : 0}% profit margin is ${businessData.netProfit / businessData.revenue > 0.3 ? 'strong' : 'moderate'} for year-over-year comparison."

5. **MARKET TREND QUESTIONS**
   Q: "What are market trends?" / "How's business doing?"
   A: Analyze metrics and provide insights
   
   Example:
   - "What are the current market trends?" → "Your business shows: ROAS ${businessData.roas ? businessData.roas.toFixed(2) : 0}x (${businessData.roas > 3 ? 'excellent' : 'needs improvement'}), profit margin ${businessData.revenue ? ((businessData.netProfit / businessData.revenue) * 100).toFixed(1) : 0}% (${businessData.netProfit / businessData.revenue > 0.3 ? 'healthy' : 'moderate'}), AOV ${formatINR(businessData.aov)}. ${businessData.aov < 2000 ? 'Focus on increasing average order value.' : 'Strong order value.'}"

🔴 CRITICAL RULES:
- ALWAYS answer the question - never say "I don't have data"
- Use exact numbers from BUSINESS DATA section
- For past questions: Use last 30 days as historical reference
- For future questions: Project based on current metrics (add 5% growth assumption)
- Be helpful, concise, and actionable
- Keep responses 2-3 sentences maximum
- Use ₹ symbol and Indian number format

📊 EXACT NUMBERS TO USE:
- Revenue = ${formatINR(businessData.revenue)} (EXACT)
- Orders = ${businessData.orders || 0} (EXACT)
- Gross Profit = ${formatINR(businessData.grossProfit)} (EXACT)
- Net Profit = ${formatINR(businessData.netProfit)} (EXACT)
- COGS = ${formatINR(businessData.cogs)} (EXACT)
- Ad Spend = ${formatINR(businessData.adSpend)} (EXACT)
- ROAS = ${businessData.roas ? businessData.roas.toFixed(2) : 0}x (EXACT)
- AOV = ${formatINR(businessData.aov)} (EXACT)

❌ DON'T:
- Say "I don't have that data"
- Refuse to answer
- Calculate or estimate beyond simple projections
- Be overly technical

✅ DO:
- Answer every question confidently
- Use exact numbers provided
- Add helpful context
- Be concise and clear`;

    const response = await this.llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(query),
    ]);

    return { ...state, response: response.content };
  }

  async createWorkflow() {
    const workflow = new StateGraph({
      channels: {
        query: null,
        userId: null,
        businessData: null,
        analysis: null,
        context: null,
        contextDocs: null,
        response: null,
      },
    });

    workflow.addNode('analyze', this.analyzeQuery.bind(this));
    workflow.addNode('fetchContext', this.fetchContext.bind(this));
    workflow.addNode('generate', this.generateResponse.bind(this));

    workflow.addEdge('analyze', 'fetchContext');
    workflow.addEdge('fetchContext', 'generate');
    workflow.addEdge('generate', END);

    workflow.setEntryPoint('analyze');

    return workflow.compile();
  }

  async processQuery(userId, query, businessData) {
    try {
      const app = await this.createWorkflow();
      
      const result = await app.invoke({
        query,
        userId,
        businessData,
      });

      return {
        success: true,
        response: result.response,
        analysis: result.analysis,
        contextUsed: result.contextDocs?.length || 0,
      };
    } catch (error) {
      console.error('❌ AI Orchestrator error:', error.message);
      return {
        success: false,
        error: error.message,
        response: 'I apologize, but I encountered an error processing your query. Please try again.',
      };
    }
  }
}

export default new AIOrchestrator();

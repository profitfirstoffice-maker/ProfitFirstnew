import express from "express";
import {
  AnalyticsData,
  getAnalyticsChart,
} from "../controller/profitfirst/analytic.js";
import auth from "../middleware/auth.js";
import { marketingData } from "../controller/profitfirst/marketing.js";
import { shipping } from "../controller/profitfirst/shipping.js";
import { dashboard } from "../controller/profitfirst/dashboard.js";
import { getDataAi } from "../controller/getDataAi.js";
import getAiPrediction from "../controller/getAiPrediction.js";
import {
  getProductsWithCosts,
  updateProductCosts,
} from "../controller/profitfirst/productmanufaturing.js";
// Import both chat implementations
import {
  sendMessageController as basicSendMessage,
  startChatController as basicStartChat,
} from "../controller/chat.js";

// Import improved AI chat with LangGraph
import {
  initializeChatController,
  sendChatMessageController,
  getBusinessInsightsController,
} from "../controller/chatImproved.js";

// Import test chat (no auth required)
import { testChatController } from "../controller/chatTest.js";

const router = express.Router();

router.get("/dashboard", auth, dashboard);
router.get("/analytics", auth, AnalyticsData);
router.get("/analyticschart", auth, getAnalyticsChart);
router.get("/marketingData", auth, marketingData);
router.get("/shipping", auth, shipping);

//chatbot - Basic OpenAI (fallback)
router.post("/newchat", auth, basicStartChat);
router.post("/chatmessage", auth, basicSendMessage);

// AI Chat - Advanced LangGraph + Pinecone
router.post("/ai/init", auth, initializeChatController);
router.post("/ai/chat", auth, sendChatMessageController);
router.get("/ai/insights", auth, getBusinessInsightsController);

// Test endpoint (no auth) - for testing AI responses
router.post("/ai/test", testChatController);

// AI Data endpoint
router.get("/getData", auth, getDataAi);

router.get("/aiprediction", auth, getAiPrediction);

// too update the product manufaturing cost
router.get("/all-with-costs", auth, getProductsWithCosts);
router.post("/update-costs", auth, updateProductCosts);
export default router;

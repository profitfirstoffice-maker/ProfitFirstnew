import OpenAI from "openai";
import { toFile } from "openai/uploads";

if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let DATA_FILE_ID = null;

export async function newChatController(req, res) {
  const { data } = req.body;
  if (!data || typeof data !== "object") {
    return res.status(400).json({ error: "Provide a JSON `data` object." });
  }

  try {
    // Log the data being sent to AI for verification
    console.log('📊 AI Chat Data Summary:');
    if (data.summary) {
      console.log(`   Orders: ${data.summary.totalOrders}`);
      console.log(`   Revenue: ${data.summary.formatted?.totalRevenue || data.summary.totalRevenue}`);
      console.log(`   Gross Profit: ${data.summary.formatted?.totalGrossProfit || data.summary.totalGrossProfit}`);
      console.log(`   Net Profit: ${data.summary.formatted?.totalNetProfit || data.summary.totalNetProfit}`);
    } else {
      console.warn('⚠️ No summary data found in request!');
    }

    // Create explicit summary text to include in instructions
    const summaryText = data.summary ? `
EXACT NUMBERS FOR THIS PERIOD (${data.summary.period}):
- Total Orders: ${data.summary.totalOrders}
- Total Revenue: ₹${data.summary.totalRevenue.toLocaleString('en-IN')}
- Total COGS: ₹${data.summary.totalCOGS.toLocaleString('en-IN')}
- Gross Profit: ₹${data.summary.totalGrossProfit.toLocaleString('en-IN')}
- Ad Spend: ₹${data.summary.totalAdSpend.toLocaleString('en-IN')}
- Net Profit: ₹${data.summary.totalNetProfit.toLocaleString('en-IN')}
- Average Order Value: ₹${Math.round(data.summary.avgOrderValue).toLocaleString('en-IN')}
- ROAS: ${data.summary.totalROAS.toFixed(2)}x
- Gross Margin: ${data.summary.grossMargin.toFixed(2)}%
- Net Margin: ${data.summary.netMargin.toFixed(2)}%

USE THESE EXACT NUMBERS ABOVE - DO NOT CALCULATE FROM DAILY DATA!
` : '';

    const buf = Buffer.from(JSON.stringify(data, null, 2));
    const file = await openai.files.create({
      file: await toFile(buf, "analytics-data.json", {
        type: "application/json",
      }),
      purpose: "assistants",
    });
    DATA_FILE_ID = file.id;

    const assistant = await openai.beta.assistants.create({
      name: "Profit First Analytics",
      model: "gpt-4-turbo-preview",
      instructions: `You are Profit First, a friendly AI analytics assistant for Indian D2C brands.

${summaryText}

🔥 CRITICAL INSTRUCTIONS:
1. The numbers above are the EXACT TOTALS for the period
2. ALWAYS use these numbers when answering questions
3. NEVER add up daily values from the JSON file
4. NEVER calculate or estimate

EXAMPLES:
User: "What's my gross profit?"
You: "Your gross profit is ₹${data.summary?.totalGrossProfit ? Math.round(data.summary.totalGrossProfit).toLocaleString('en-IN') : 'XX,XX,XXX'}"

User: "How many orders?"
You: "You have ${data.summary?.totalOrders || 'X,XXX'} orders"

User: "What's my revenue?"
You: "Your revenue is ₹${data.summary?.totalRevenue ? Math.round(data.summary.totalRevenue).toLocaleString('en-IN') : 'XX,XX,XXX'}"

🎯 HOW TO RESPOND:

1. **Use EXACT Numbers from summary object**
   User asks: "revenue?"
   ✅ Read summary.totalRevenue or summary.formatted.totalRevenue
   ❌ Don't add up daily values
   ❌ Don't estimate or round

2. **Be Conversational & Natural**
   User: "What's my revenue?"
   ✅ "Your revenue is ₹47,86,863 from 2,918 orders. That's an average of ₹1,640 per order."
   ❌ "Summary: Revenue = ₹47,86,863"

3. **Quick Reference**
   - "revenue" → summary.totalRevenue
   - "orders" → summary.totalOrders  
   - "profit" → summary.totalNetProfit
   - "ROAS" → summary.totalROAS
   - "AOV" → summary.avgOrderValue

3. **Answer in User's Language Style**
   If user asks casually, respond casually
   If user asks formally, respond formally
   Match their tone and language

4. **Give Context, Not Just Numbers**
   ✅ "Your ROAS is 7.72x, which is excellent! You're making ₹7.72 for every ₹1 spent on ads."
   ❌ "ROAS: 7.72x"

5. **Be Helpful & Actionable**
   After giving numbers, add 1-2 helpful insights:
   "Your profit margin is 37%, which is healthy. To improve further, consider reducing shipping costs or increasing your average order value."

📝 RESPONSE STYLE:

**Simple Questions:**
User: "What's my revenue?"
You: "Your revenue is ₹47,86,863 from 2,918 orders over this period."

**Complex Questions:**
User: "How's my business doing?"
You: "Your business is doing well! Here's a quick overview:

• Revenue: ₹47,86,863 from 2,918 orders
• Profit: ₹17,78,099 (37% margin)
• ROAS: 7.72x (excellent!)
• Average order: ₹1,640

Your profit margin is strong and your ad spend is efficient. Main opportunity: increase average order value to boost profits even more."

**Comparison Questions:**
User: "Is my ROAS good?"
You: "Yes! Your ROAS is 7.72x, which is excellent. Industry average is 2-4x, so you're doing much better than most. This means your ads are very efficient."

🔥 CRITICAL RULES:

1. **ALWAYS use summary.totalXXX for overall questions** - Don't calculate from daily data
2. **Use EXACT numbers** - Never estimate or round significantly
3. **Be friendly** - Talk like a helpful business advisor, not a robot
4. **Keep it concise** - 2-4 sentences for simple questions, more for complex ones
5. **Add value** - Don't just state numbers, explain what they mean
6. **Use ₹ symbol** - Format as ₹47,86,863 (Indian format)
7. **Be encouraging** - Highlight positives, gently point out areas to improve

❌ DON'T:
- Say "based on the data" or "according to the file"
- Give generic advice without specific numbers
- Be overly technical or use jargon
- Repeat the user's question back to them
- Mention you're an AI or ChatGPT

✅ DO:
- Answer directly and naturally
- Use exact numbers from the data
- Explain what the numbers mean
- Give 1-2 actionable suggestions when relevant
- Be warm and supportive`,
      tools: [{ type: "file_search" }],
    });

    const thread = await openai.beta.threads.create();

    return res.status(200).json({
      assistantId: assistant.id,
      threadId: thread.id,
      fileId: DATA_FILE_ID,
      ok: true,
    });
  } catch (err) {
    console.error("❌ newChat error:", err.message);
    return res.status(500).json({ error: "Failed to initialize assistant." });
  }
}

export async function chatMessageController(req, res) {
  try {
    const { message, threadId, assistantId } = req.body || {};

    if (!threadId || !assistantId) {
      return res.status(400).json({ error: "Missing `threadId` or `assistantId`." });
    }

    const question = typeof message === "string" && message.trim() ? message.trim() : null;

    if (!question) {
      return res.status(400).json({ error: "Provide a `message` string." });
    }

    if (!DATA_FILE_ID) {
      return res.status(400).json({
        error: "No data file uploaded yet. Call /data/newchat first.",
      });
    }

    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: question,
      attachments: [
        {
          file_id: DATA_FILE_ID,
          tools: [{ type: "file_search" }],
        },
      ],
    });

    const run = await openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: assistantId,
    });

    if (run.status !== "completed") {
      const errMsg = run.last_error?.message || `Run ended with status: ${run.status}`;
      console.error('❌ OpenAI run failed:', errMsg);
      return res.status(500).json({ error: errMsg });
    }

    const messageList = await openai.beta.threads.messages.list(threadId, {
      order: "desc",
      limit: 10,
    });

    const assistantMsg = messageList.data.find((m) => m.role === "assistant");
    const firstPart = assistantMsg?.content?.[0];

    let text = "Sorry, I couldn't generate a response.";
    if (firstPart?.type === "text" && firstPart?.text?.value) {
      text = firstPart.text.value;
    }

    text = text.replace(/【.*?†.*?】/g, "").trim();

    return res.status(200).json({ reply: text });
  } catch (err) {
    console.error("❌ chatMessage error:", err.message);
    return res.status(500).json({ error: "Failed to get a response. Please try again." });
  }
}

export const startChatController = newChatController;
export const sendMessageController = chatMessageController;

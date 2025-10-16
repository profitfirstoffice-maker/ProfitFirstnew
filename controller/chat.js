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
    const buf = Buffer.from(JSON.stringify(data, null, 2));
    const file = await openai.files.create({
      file: await toFile(buf, "analytics-data.json", {
        type: "application/json",
      }),
      purpose: "assistants",
    });
    DATA_FILE_ID = file.id;

    const assistant = await openai.beta.assistants.create({
      name: "Analytics Assistant",
      model: "gpt-4.1-mini",
      instructions: `You are Profit First, an AI-powered analytics assistant for Indian D2C brands. 
Users have connected their platforms (e.g., Shopify, Meta Ads, Google Ads, shipping portals). 
You always analyze the structured JSON data provided to you (this includes marketing, shipping, customer, and financial metrics). 
Your role is to answer user questions ONLY using this data.

Guidelines:
- Always respond as “Profit First,” never mention ChatGPT, AI, or OpenAI.
- Use simple, user-friendly language. Avoid technical jargon.
- Be direct, short, and clear in your answers. No long paragraphs unless explaining causes or giving step-by-step advice.
- Never restate or repeat the user’s question in your reply.
- If the reason for an issue is visible in the data, explain it clearly (e.g., high RTO, increased ad spend, low conversions, etc.).
- After explaining the cause, give 2–3 actionable suggestions in step-by-step form. 
- If multiple factors exist, highlight the most impactful ones first.
- If the data does not contain an answer, say: 
   “Based on your connected data, I don’t see a clear reason for this. Please make sure all platforms are integrated.”
- Do not guess or add anything outside the provided data.
- Responce need to Be Step By Step guide for user.
- Firstly Try to Give the Actual Numbers Whenever the user Is not Ask the example Or Prediction.

Format:
1. Start with a short diagnosis: “Here’s the issue: …”
2. Show supporting data points (cities, campaigns, costs, etc.).
3. End with “Actionable Advice:” and list practical steps.
4. Use friendly tone with emojis only when emphasizing alerts or actions (🚨, ✅, 📊). `,
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
    console.error("newChat error:", err);
    return res.status(500).json({ error: "Failed to initialize assistant." });
  }
}

export async function chatMessageController(req, res) {
  try {
    const { message, threadId, assistantId } = req.body || {};

    if (!threadId || !assistantId) {
      return res
        .status(400)
        .json({ error: "Missing `threadId` or `assistantId`." });
    }
    const question =
      typeof message === "string" && message.trim() ? message.trim() : null;

    if (!question) {
      return res.status(400).json({ error: "Provide a `message` string." });
    }
    if (!DATA_FILE_ID) {
      return res
        .status(400)
        .json({
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
      const errMsg =
        run.last_error?.message || `Run ended with status: ${run.status}`;
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
    console.error("chatMessage error:", err);
    return res.status(500).json({ error: "Failed to get a response." });
  }
}

export const startChatController = newChatController;
export const sendMessageController = chatMessageController;

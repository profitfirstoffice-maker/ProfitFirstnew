// Suggested updates for client/src/pages/ChatBot.jsx
// These changes improve UX during the 10-15 second initialization

// 1. Add better loading state
const [initProgress, setInitProgress] = useState("");

// 2. Update initialization with progress messages
const initializeChat = async () => {
  try {
    setIsLoading(true);
    setError(null);

    // Show progress
    setInitProgress("Fetching your business data...");
    setMessages([
      {
        sender: "bot",
        text: "Initializing... Fetching your business data (this may take 10-15 seconds)",
        isAnalysis: true,
        timestamp: new Date().toISOString(),
      },
    ]);

    const { data: analyticsData } = await axiosInstance.get("/data/getData");

    if (onAnalysisComplete) {
      onAnalysisComplete(analyticsData);
    }

    setInitProgress("Processing analytics...");
    
    const { data: sessionData } = await axiosInstance.post(
      "/data/newchat",
      { data: analyticsData }
    );

    setChatSession({
      threadId: sessionData.threadId,
      assistantId: sessionData.assistantId,
    });

    setInitProgress("");
    setMessages([
      {
        sender: "bot",
        text: "Welcome! I'm your analytics assistant. I have access to your business data and can answer questions about revenue, orders, profits, marketing, and shipping. What would you like to know?",
        isAnalysis: true,
        timestamp: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    setInitProgress("");
    
    // Better error handling
    if (err.response?.status === 429) {
      setError("Rate limit reached. Please wait 30 seconds and refresh.");
      toast.error("Rate limit reached. Please wait and try again.");
    } else if (err.response?.status === 401) {
      setError("Authentication failed. Please check your API credentials.");
      toast.error("Please check your API credentials in Settings.");
    } else {
      setError("Failed to initialize analytics assistant");
      toast.error("Could not connect to analytics service. Please try again.");
    }
    
    setMessages([
      {
        sender: "bot",
        text: "I'm having trouble connecting to your data. This could be due to:\n\n1. API rate limiting (wait 30 seconds and refresh)\n2. Expired API credentials (check Settings)\n3. No data available for the selected period\n\nPlease check your connections and try again.",
        isError: true,
        timestamp: new Date().toISOString(),
      },
    ]);
  } finally {
    setIsLoading(false);
  }
};

// 3. Update the header to show progress
<div className="bg-black/20 p-4 text-white">
  <div className="flex justify-between">
    <h2 className="text-lg font-semibold">Analytics Assistant</h2>
    <button
      onClick={onClose}
      className="text-white text-xl hover:text-green-400 transition-colors"
      title="Close chatbot"
    >
      <AiOutlineClose />
    </button>
  </div>
  <p className="text-xs opacity-80">
    {initProgress 
      ? initProgress 
      : isReady 
        ? "Ready to answer your questions" 
        : "Initializing assistant..."}
  </p>
</div>

// 4. Update suggested questions to be more specific
const suggestedQuestions = [
  "What is my total revenue?",
  "How many orders do I have?",
  "What is my ROAS?",
  "What is my net profit?",
  "How is my shipping performance?",
  "What are my top products?",
];

// 5. Add better error message display
{error && (
  <div className="flex items-center text-red-400 text-xs mb-2 p-2 bg-red-900/20 rounded">
    <FiAlertCircle className="mr-2 flex-shrink-0" />
    <span>{error}</span>
  </div>
)}

// 6. Update placeholder text
placeholder={
  isLoading
    ? "Processing..."
    : !isReady
    ? "Initializing (10-15 seconds)..."
    : "Ask about revenue, orders, ROAS, profits, or shipping..."
}

// ALTERNATIVE: Use improved AI endpoints (faster, no data fetch needed)
// Replace the entire initialization with:

const initializeChat = async () => {
  try {
    setIsLoading(true);
    setError(null);

    setMessages([
      {
        sender: "bot",
        text: "Initializing...",
        isAnalysis: true,
        timestamp: new Date().toISOString(),
      },
    ]);

    // Use improved AI endpoint (no need to fetch data first)
    await axiosInstance.post("/data/ai/init");

    setChatSession({ initialized: true }); // Simple flag

    setMessages([
      {
        sender: "bot",
        text: "Welcome! I'm your analytics assistant. Ask me anything about your business metrics, revenue, orders, profits, marketing, or shipping.",
        isAnalysis: true,
        timestamp: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    setError("Failed to initialize analytics assistant");
    toast.error("Could not connect to analytics service");
  } finally {
    setIsLoading(false);
  }
};

// And update sendMessage to use improved endpoint:
const sendMessage = useCallback(async () => {
  if (!input.trim() || !chatSession || isLoading) return;

  const userMessage = {
    sender: "user",
    text: input.trim(),
    timestamp: new Date().toISOString(),
  };
  setMessages((prev) => [...prev, userMessage]);
  const currentInput = input.trim();
  setInput("");
  setIsLoading(true);

  try {
    // Use improved AI endpoint
    const { data } = await axiosInstance.post("/data/ai/chat", {
      message: currentInput
    });

    const botMessage = {
      sender: "bot",
      text: data.reply,
      isAnalysis: true,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, botMessage]);
  } catch (err) {
    const msg = err.response?.data?.error || "Sorry, I encountered an error.";
    toast.error(msg);
    setMessages((prev) => [
      ...prev,
      {
        sender: "bot",
        text: err.response?.data?.reply || "Sorry, I encountered an error processing your request.",
        isError: true,
        timestamp: new Date().toISOString(),
      },
    ]);
  } finally {
    setIsLoading(false);
  }
}, [input, isLoading, chatSession]);

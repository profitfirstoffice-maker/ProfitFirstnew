import React, { useState } from "react";
import { toast } from "react-toastify";
import axiosInstance from "../../axios";
import { PulseLoader } from "react-spinners";
import axios from "axios";

const Step2 = ({ onComplete }) => {
  const [platform, setPlatform] = useState("Shopify");
  const [storeUrl, setStoreUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!storeUrl) return toast.error("Please enter your store URL");

    let correctedStoreUrl = storeUrl.trim().toLowerCase();
    if (!correctedStoreUrl.endsWith(".myshopify.com")) {
      return toast.error(
        "Invalid Shopify store URL. It must end with '.myshopify.com'"
      );
    }

    const url = `https://www.profitfirst.co.in/connect?shop=${storeUrl}`;
    window.open(url, "_blank", "width=800,height=600");
  };

  const handleDone = async () => {
    if (!storeUrl) return toast.error("Please enter your store URL");

    setLoading(true);
    try {
      const res = await axiosInstance.get("/onboard/proxy/token", {
        params: { shop: storeUrl, password: "Sachin369" },
      });

      const accessToken = res.data.accessToken;
      await axiosInstance.post("/onboard/step2", {
        storeUrl,
        apiKey: "oauth",
        apiSecret: "oauth",
        accessToken,
      });

      toast.success("✅ Shopify store connected successfully!");
      onComplete();
    } catch (err) {
      console.error("Done error:", err);
      toast.error(
        "❌ Failed to complete onboarding. Please ensure the app is installed."
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0D1D1E]">
        <PulseLoader size={60} color="#12EB8E" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#101218] text-white flex flex-col items-center justify-center relative overflow-hidden">
      <style>{`
        .bg-blob {
          position: absolute;
          width: 380px;
          height: 380px;
          filter: blur(80px);
          opacity: 0.14;
          z-index: 0;
          border-radius: 50%;
        }
        .blob-left { left: -120px; top: 100%; background: #5fc61fff; transform: translateY(-50%); }
        .blob-right { right: -120px; top: 0%; background: #5fc61fff; transform: translateY(0%); }
      `}</style>
      <div className="bg-blob blob-left"></div>
      <div className="bg-blob blob-right"></div>
      {/* Header logo */}
      <header className="w-full max-w-7xl px-12 py-10 flex items-center gap-3">
        <img
          src="https://res.cloudinary.com/dqdvr35aj/image/upload/v1748330108/Logo1_zbbbz4.png"
          alt="Profit First Logo"
          className="w-35"
        />
      </header>

      {/* Main layout */}
      <main className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-between px-12 gap-16">
        {/* LEFT CARD */}
        <div className="bg-[#1E1E1E] border-[#1E1E1E] rounded-[20px] p-10 shadow-lg w-full max-w-md">
          {/* Platform tabs */}
          <div className="rounded-lg p-1 flex mb-6 justify-center">
            <button
              onClick={() => setPlatform("Shopify")}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors duration-300 ${
                platform === "Shopify"
                  ? "bg-white text-black font-semibold"
                  : "bg-transparent text-gray-400"
              }`}
            >
              Shopify
            </button>
            <button
              onClick={() => setPlatform("Wordpress")}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors duration-300 ${
                platform === "Wordpress"
                  ? "bg-white text-black font-semibold"
                  : "bg-transparent text-gray-400"
              }`}
            >
              Wordpress
            </button>
          </div>

          {/* Shopify icon */}
          <div className="flex justify-center mb-5">
            <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center shadow-md">
              <img
                src="https://cdn.shopify.com/static/shopify-favicon.png"
                alt="Shopify Logo"
                className="w-10 h-10 object-contain"
              />
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-center text-2xl font-bold mb-2">
            Connect your Shopify Store
          </h2>
          <p className="text-center text-sm text-gray-400 mb-8">
            Track your accounts profit, sells and buys in detail with your
            Shopify store.
          </p>

          {/* Input */}
          <label className="block text-sm text-gray-400 mb-2">
            Shopify Store URL
          </label>
          <input
            type="text"
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
            placeholder="myshopify.com"
            className="w-full px-4 py-3 rounded-lg bg-transparent border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 mb-8"
          />

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleDone}
              className="px-6 py-2.5 rounded-full bg-[#4A4A4A] text-white text-sm font-semibold transition hover:bg-gray-500"
            >
              Next
            </button>
            <button
              onClick={handleConnect}
              className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-gray-100 transition"
            >
              Connect
            </button>
          </div>
        </div>
        {/* RIGHT VIDEO SECTION */}
        <div className="bg-[#141617] rounded-[20px] w-full max-w-xl h-[300px] flex items-center justify-center shadow-md">
          <div className="w-20 h-20 rounded-full border-2 border-gray-400 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-gray-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7-11-7z" />
            </svg>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Step2;

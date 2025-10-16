import React, { useState, useEffect } from "react";
import axiosInstance from "../../axios";
import { toast } from "react-toastify";

const TABS = ["Account", "Shopify", "Meta Ads", "Shiprocket"];

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [basic, setBasic] = useState({ firstName: "", lastName: "", email: "" });
  const [shopify, setShopify] = useState({ storeUrl: "", apiKey: "", apiSecret: "", accessToken: "" });
  const [meta, setMeta] = useState({ adAccountId: "" });
  const [shiprocket, setShiprocket] = useState({ shiproactId: "", shiproactPassword: "" });
  const [activeTab, setActiveTab] = useState("Account");

  useEffect(() => {
    axiosInstance
      .get("/user/profile")
      .then((res) => {
        const data = res.data;
        setProfile(data);
        setBasic({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.email || "",
        });
        setShopify(data.onboarding.step2 || { storeUrl: "", apiKey: "", apiSecret: "", accessToken: "" });
        setMeta(data.onboarding.step4 || { adAccountId: "" });
        setShiprocket(data.onboarding.step5 || { shiproactId: "", shiproactPassword: "" });
      })
      .catch((err) => console.error("Error fetching profile:", err));
  }, []);

  const save = async (url, payload) => {
    try {
      await axiosInstance.put(url, payload);
      toast.success("Saved successfully!");
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Error saving data");
    }
  };

  if (!profile) {
    return <div className="text-center py-20 text-white">Loading…</div>;
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <h1 className="text-3xl font-bold text-white">Settings</h1>
      <p className="text-gray-400 mt-1 mb-6">Manage your account settings and preferences</p>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition 
              ${activeTab === tab
                ? "bg-white text-black"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"}
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Sections */}
      {activeTab === "Account" && (
        <div className="bg-[#161616] p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-white mb-2">Profile</h2>
          <p className="text-gray-400 mb-4">Set your account details</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Name</label>
              <input
                type="text"
                value={basic.firstName}
                onChange={(e) => setBasic(b => ({ ...b, firstName: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white"
                placeholder="First Name"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Surname</label>
              <input
                type="text"
                value={basic.lastName}
                onChange={(e) => setBasic(b => ({ ...b, lastName: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white"
                placeholder="Last Name"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={basic.email}
                onChange={(e) => setBasic(b => ({ ...b, email: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white"
                placeholder="Email"
              />
            </div>
          </div>
          <div className="mt-6">
            <button
              onClick={() => save("/user/profile/basic", basic)}
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded transition"
            >
              Update
            </button>
          </div>
        </div>
      )}

      {activeTab === "Shopify" && (
        <div className="bg-[#161616] p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-white mb-2">Shopify Credentials</h2>
          <p className="text-gray-400 mb-4">Connect your Shopify store</p>
          <div className="space-y-4">
            {['storeUrl','apiKey','apiSecret','accessToken'].map(field => (
              <div key={field}>
                <label className="block text-sm text-gray-300 mb-1 capitalize">{field}</label>
                <input
                  type="text"
                  value={shopify[field] || ''}
                  onChange={e => setShopify(s => ({ ...s, [field]: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white"
                  placeholder={field}
                />
              </div>
            ))}
            <button
              onClick={() => save("/user/profile/shopify", shopify)}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded transition"
            >
              Update 
            </button>
          </div>
        </div>
      )}

      {activeTab === "Meta Ads" && (
        <div className="bg-[#161616] p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-white mb-2">Meta Ads</h2>
          <p className="text-gray-400 mb-4">Configure your Meta ad account</p>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Ad Account ID</label>
            <input
              type="text"
              value={meta.adAccountId || ''}
              onChange={e => setMeta(m => ({ ...m, adAccountId: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white"
              placeholder="Ad Account ID"
            />
          </div>
          <div className="mt-6">
            <button
              onClick={() => save("/user/profile/meta", meta)}
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded transition"
            >
              Update
            </button>
          </div>
        </div>
      )}

      {activeTab === "Shiprocket" && (
        <div className="bg-[#161616] p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-white mb-2">Shiprocket</h2>
          <p className="text-gray-400 mb-4">Manage your Shiprocket credentials</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={shiprocket.shiproactId || ''}
                onChange={e => setShiprocket(s => ({ ...s, shiproactId: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white"
                placeholder="Shiprocket Email"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Password</label>
              <input
                type="password"
                value={shiprocket.shiproactPassword || ''}
                onChange={e => setShiprocket(s => ({ ...s, shiproactPassword: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white"
                placeholder="Shiprocket Password"
              />
            </div>
          </div>
          <div className="mt-6">
            <button
              onClick={() => save("/user/profile/shiprocket", shiprocket)}
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded transition"
            >
              Update
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

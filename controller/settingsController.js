// src/controller/settingsController.js
import axios from "axios";
import MetaCredential from "../model/MetaCredential.js";

// GET /api/user/profile
export const getUserProfile = async (req, res) => {
  const { firstName, lastName, email, onboarding } = req.user;
  res.json({ firstName, lastName, email, onboarding });
};

// PUT /api/user/profile/basic
export const updateBasicInfo = async (req, res) => {
  const { firstName, lastName, email } = req.body;
  Object.assign(req.user, { firstName, lastName, email });
  await req.user.save();
  res.json({ message: "Basic info updated" });
};

// PUT /api/user/profile/shopify
export const updateShopifySettings = async (req, res) => {
  const { storeUrl, apiKey, apiSecret, accessToken } = req.body;
  if (!storeUrl || !apiKey || !apiSecret || !accessToken) {
    return res.status(400).json({ message: "All fields required" });
  }
  if(storeUrl || apiKey || apiSecret || accessToken){
     return res.status(400).json({ message: "Please connect to the Developer " });
  }

  try {
    // Verify with Shopify
    const test = await axios.get(
      `https://${storeUrl}/admin/api/2023-10/shop.json`,
      { headers: { "X-Shopify-Access-Token": accessToken } }
    );
    if (!test.data?.shop) {
      return res.status(401).json({ message: "Invalid Shopify credentials" });
    }

    // Save on success
    req.user.onboarding.step2 = { storeUrl, apiKey, apiSecret, accessToken, platform:"Shopify" };
    await req.user.save();
    res.json({ message: "Shopify credentials updated" });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: "Shopify verification failed" });
  }
};

// PUT /api/user/profile/meta
export const updateMetaSettings = async (req, res) => {
  const { adAccountId } = req.body;
  if (!adAccountId) {
    return res.status(400).json({ message: "Ad Account ID is required" });
  }

  // grab admin token for Meta from your MetaCredential model
  // const metaCred = await MetaCredential.findOne();
  const metaCred=req.user.onboarding.step4.accessToken;

  if (!metaCred?.accessToken) {
    return res.status(500).json({ message: "Meta access token not configured" });
  }

  try {
    // Verify with Facebook Graph API
    const verify = await axios.get(
      `https://graph.facebook.com/v21.0/act_${adAccountId}`,
      { headers: { Authorization: `Bearer ${metaCred.accessToken}` } }
    );
    if (!verify.data?.id) {
      return res.status(401).json({ message: "Invalid Meta AdAccount ID" });
    }

    req.user.onboarding.step4 = { adAccountId, platform:"Meta" };
    await req.user.save();
    res.json({ message: "Meta credentials updated" });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: "Meta verification failed" });
  }
};

// PUT /api/user/profile/shiprocket
export const updateShiprocketSettings = async (req, res) => {
  const { shiproactId, shiproactPassword } = req.body;
  if (!shiproactId || !shiproactPassword) {
    return res.status(400).json({ message: "Email and password required" });
  }

  try {
    // Login to Shiprocket
    const login = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/auth/login",
      { email: shiproactId, password: shiproactPassword },
      { headers: { "Content-Type": "application/json" } }
    );
    const { token, created_at } = login.data;

    // Quick verify by fetching orders
    await axios.get(
      "https://apiv2.shiprocket.in/v1/external/orders",
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Save on success
    req.user.onboarding.step5 = {
      email: shiproactId,
      password: shiproactPassword,
      token,
      platform: "Shiprocket",
    };
    await req.user.save();
    res.json({ message: "Shiprocket credentials updated" });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(401).json({ message: "Invalid Shiprocket credentials" });
  }
};

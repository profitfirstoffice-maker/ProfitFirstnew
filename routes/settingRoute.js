// src/routes/settings.js
import express from "express";
import auth from "../middleware/auth.js";
import {
  getUserProfile,
  updateBasicInfo,
  updateShopifySettings,
  updateMetaSettings,
  updateShiprocketSettings
} from "../controller/settingsController.js";

const router = express.Router();

router.get("/profile", auth, getUserProfile);
router.put("/profile/basic", auth, updateBasicInfo);
router.put("/profile/shopify", auth, updateShopifySettings);
router.put("/profile/meta", auth, updateMetaSettings);
router.put("/profile/shiprocket", auth, updateShiprocketSettings);

export default router;

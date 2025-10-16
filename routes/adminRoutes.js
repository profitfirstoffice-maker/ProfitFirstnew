import express from "express";

import auth from "../middleware/auth.js";
import User from "../model/userModel.js";
import GetInTouch from "../model/getInTouch.js";

const router = express.Router();

router.get("/users", auth, async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.get("/contacts", auth, async (req, res) => {
  try {
    const leads = await GetInTouch.find({});
    res.json(leads);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch leads" });
  }
});

export default router;

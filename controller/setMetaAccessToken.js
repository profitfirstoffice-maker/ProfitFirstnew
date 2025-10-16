import MetaCredential from "../model/MetaCredential.js";

export const setMetaAccessToken = async (req, res) => {
  const { token,expires_in } = req.body;
  if (!token) return res.status(400).json({ message: "Token is required." });

  try {
    let existing = await MetaCredential.findOne();
    if (existing) {
      existing.accessToken = token;
      existing.expiresAt = expires_in;
      existing.updatedAt = new Date();
      await existing.save();
    } else {
      await MetaCredential.create({ accessToken: token });
    }
    res.json({ message: "Meta access token saved successfully." });
  } catch (err) {
    console.error("Error saving Meta token:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

// models/metaCredentialModel.js
import mongoose from "mongoose";

const metaCredentialSchema = new mongoose.Schema({
  accessToken: {
    type: String,
    default:"",
  },
  expiresAt: Date,
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("MetaCredential", metaCredentialSchema);

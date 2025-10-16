import mongoose from 'mongoose';

const cachedDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  dataType: {
    type: String,
    enum: ['shopify_orders', 'meta_ads', 'shiprocket', 'dashboard_summary'],
    required: true,
    index: true
  },
  dateRange: {
    startDate: { type: String, required: true },
    endDate: { type: String, required: true }
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  lastSyncedAt: {
    type: Date,
    default: Date.now
  },
  syncStatus: {
    type: String,
    enum: ['success', 'failed', 'syncing'],
    default: 'success'
  },
  errorMessage: String
}, {
  timestamps: true
});

// Compound index for fast lookups
cachedDataSchema.index({ userId: 1, dataType: 1, 'dateRange.startDate': 1, 'dateRange.endDate': 1 });

// TTL index - auto-delete after 7 days
cachedDataSchema.index({ lastSyncedAt: 1 }, { expireAfterSeconds: 604800 });

export default mongoose.model('CachedData', cachedDataSchema);

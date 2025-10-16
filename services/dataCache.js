import CachedData from '../model/CachedData.js';

class DataCacheService {
  // Check if data needs refresh (older than 30 minutes)
  static async shouldRefresh(userId, dataType, startDate, endDate) {
    const cached = await CachedData.findOne({
      userId,
      dataType,
      'dateRange.startDate': startDate,
      'dateRange.endDate': endDate,
      syncStatus: 'success'
    }).sort({ lastSyncedAt: -1 });

    if (!cached) return true;

    const age = Date.now() - new Date(cached.lastSyncedAt).getTime();
    return age > 30 * 60 * 1000; // 30 minutes
  }

  // Get cached data
  static async get(userId, dataType, startDate, endDate) {
    try {
      const cached = await CachedData.findOne({
        userId,
        dataType,
        'dateRange.startDate': startDate,
        'dateRange.endDate': endDate,
        syncStatus: 'success'
      }).sort({ lastSyncedAt: -1 }).lean();

      if (cached) {
        console.log(`[CACHE] ✓ Found cached ${dataType} for user ${userId}`);
      } else {
        console.log(`[CACHE] ✗ No cached ${dataType} found for user ${userId}`);
      }

      return cached?.data || null;
    } catch (error) {
      console.error(`[CACHE] Error getting ${dataType}:`, error.message);
      return null;
    }
  }

  // Save data to cache
  static async set(userId, dataType, startDate, endDate, data) {
    try {
      console.log(`[CACHE] Saving ${dataType} for user ${userId} (${startDate} to ${endDate})`);
      
      const result = await CachedData.findOneAndUpdate(
        {
          userId,
          dataType,
          'dateRange.startDate': startDate,
          'dateRange.endDate': endDate
        },
        {
          userId,
          dataType,
          dateRange: { startDate, endDate },
          data,
          lastSyncedAt: new Date(),
          syncStatus: 'success',
          errorMessage: null
        },
        { upsert: true, new: true }
      );
      
      console.log(`[CACHE] ✓ Saved ${dataType} successfully (ID: ${result._id})`);
      return result;
    } catch (error) {
      console.error(`[CACHE] ✗ Failed to save ${dataType}:`, error.message);
      throw error;
    }
  }

  // Mark as syncing
  static async markSyncing(userId, dataType, startDate, endDate) {
    await CachedData.findOneAndUpdate(
      {
        userId,
        dataType,
        'dateRange.startDate': startDate,
        'dateRange.endDate': endDate
      },
      {
        syncStatus: 'syncing',
        lastSyncedAt: new Date()
      },
      { upsert: true }
    );
  }

  // Mark as failed
  static async markFailed(userId, dataType, startDate, endDate, error) {
    await CachedData.findOneAndUpdate(
      {
        userId,
        dataType,
        'dateRange.startDate': startDate,
        'dateRange.endDate': endDate
      },
      {
        syncStatus: 'failed',
        errorMessage: error,
        lastSyncedAt: new Date()
      },
      { upsert: true }
    );
  }

  // Clear cache for user
  static async clearUserCache(userId) {
    await CachedData.deleteMany({ userId });
  }
}

export default DataCacheService;

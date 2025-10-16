import cron from 'node-cron';
import User from '../model/userModel.js';
import DataCacheService from '../services/dataCache.js';
import { getShopifyData } from '../controller/profitfirst/dashboard.js';
import { fetchMetaOverview, fetchMetaDaily } from '../services/metaService.js';
import { getShiprocketData } from '../services/shiprocketService.js';

// Run every 30 minutes
const syncJob = cron.schedule('*/30 * * * *', async () => {
  console.log('[SYNC JOB] Starting data sync...');
  
  try {
    const users = await User.find({
      'onboarding.step2.accessToken': { $exists: true },
      'onboarding.step4.accessToken': { $exists: true },
      'onboarding.step5.token': { $exists: true }
    }).select('_id onboarding');

    console.log(`[SYNC JOB] Found ${users.length} users to sync`);

    for (const user of users) {
      try {
        const today = new Date();
        const endDate = today.toISOString().split('T')[0];
        const startDate = new Date(today.setDate(today.getDate() - 29)).toISOString().split('T')[0];

        // Check if sync is needed
        const needsSync = await DataCacheService.shouldRefresh(
          user._id,
          'dashboard_summary',
          startDate,
          endDate
        );

        if (!needsSync) {
          console.log(`[SYNC JOB] Skipping user ${user._id} - data is fresh`);
          continue;
        }

        console.log(`[SYNC JOB] Syncing data for user ${user._id}`);

        // Sync all data sources in parallel
        const [shopifyOrders, metaOverview, metaDaily, shiprocket] = await Promise.allSettled([
          getShopifyData(
            user.onboarding.step2.accessToken,
            user.onboarding.step2.storeUrl,
            startDate,
            endDate
          ),
          fetchMetaOverview(
            user.onboarding.step4.accessToken,
            user.onboarding.step4.adAccountId,
            startDate,
            endDate
          ),
          fetchMetaDaily(
            user.onboarding.step4.accessToken,
            user.onboarding.step4.adAccountId,
            startDate,
            endDate
          ),
          getShiprocketData(
            user.onboarding.step5.token,
            startDate,
            endDate
          )
        ]);

        // Save to cache
        if (shopifyOrders.status === 'fulfilled') {
          await DataCacheService.set(user._id, 'shopify_orders', startDate, endDate, shopifyOrders.value);
        }

        if (metaOverview.status === 'fulfilled' && metaDaily.status === 'fulfilled') {
          await DataCacheService.set(user._id, 'meta_ads', startDate, endDate, {
            overview: metaOverview.value,
            daily: metaDaily.value
          });
        }

        if (shiprocket.status === 'fulfilled') {
          await DataCacheService.set(user._id, 'shiprocket', startDate, endDate, shiprocket.value);
        }

        console.log(`[SYNC JOB] Successfully synced user ${user._id}`);
      } catch (error) {
        console.error(`[SYNC JOB] Error syncing user ${user._id}:`, error.message);
      }
    }

    console.log('[SYNC JOB] Data sync completed');
  } catch (error) {
    console.error('[SYNC JOB] Sync job error:', error);
  }
}, {
  scheduled: false
});

export const startDataSync = () => {
  syncJob.start();
  console.log('[SYNC JOB] Auto-sync started - runs every 30 minutes');
};

export const stopDataSync = () => {
  syncJob.stop();
  console.log('[SYNC JOB] Auto-sync stopped');
};

export default syncJob;

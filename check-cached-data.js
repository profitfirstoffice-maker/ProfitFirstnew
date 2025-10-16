import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CachedData from './model/CachedData.js';

dotenv.config();

async function checkCachedData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    console.log('📊 Checking all cached data...\n');
    
    const allData = await CachedData.find().sort({ lastSyncedAt: -1 }).lean();
    
    console.log(`Total cached records: ${allData.length}\n`);
    
    if (allData.length === 0) {
      console.log('No cached data found. This is normal if:');
      console.log('  1. Server just started');
      console.log('  2. No users have accessed dashboard yet');
      console.log('  3. Sync job hasn\'t run yet\n');
    } else {
      allData.forEach((record, index) => {
        console.log(`Record ${index + 1}:`);
        console.log(`  ID: ${record._id}`);
        console.log(`  User ID: ${record.userId}`);
        console.log(`  Data Type: ${record.dataType}`);
        console.log(`  Date Range: ${record.dateRange.startDate} to ${record.dateRange.endDate}`);
        console.log(`  Last Synced: ${record.lastSyncedAt}`);
        console.log(`  Status: ${record.syncStatus}`);
        
        // Show data summary
        if (record.dataType === 'shopify_orders' && Array.isArray(record.data)) {
          console.log(`  Shopify Orders: ${record.data.length} orders`);
        } else if (record.dataType === 'meta_ads' && record.data) {
          console.log(`  Meta Ads: Overview + ${record.data.daily?.length || 0} daily records`);
        } else if (record.dataType === 'shiprocket' && record.data) {
          console.log(`  Shiprocket: ${record.data.shipping?.length || 0} metrics`);
        }
        
        if (record.errorMessage) {
          console.log(`  Error: ${record.errorMessage}`);
        }
        console.log('');
      });
    }

    // Group by user
    const byUser = {};
    allData.forEach(record => {
      const userId = record.userId.toString();
      if (!byUser[userId]) {
        byUser[userId] = [];
      }
      byUser[userId].push(record.dataType);
    });

    console.log('📈 Summary by User:');
    Object.keys(byUser).forEach(userId => {
      console.log(`  User ${userId}:`);
      console.log(`    Data types: ${byUser[userId].join(', ')}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

checkCachedData();

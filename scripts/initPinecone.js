import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';

dotenv.config();

async function initializePinecone() {
  try {
    console.log('🚀 Initializing Pinecone...');

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const indexName = process.env.PINECONE_INDEX_NAME || 'profitfirst-analytics';

    // List existing indexes
    console.log('📋 Checking existing indexes...');
    const existingIndexes = await pinecone.listIndexes();
    console.log('Existing indexes:', existingIndexes.indexes?.map(i => i.name) || []);

    const indexExists = existingIndexes.indexes?.some(idx => idx.name === indexName);

    if (indexExists) {
      console.log(`✅ Index "${indexName}" already exists!`);
      
      // Get index stats
      const index = pinecone.Index(indexName);
      const stats = await index.describeIndexStats();
      console.log('📊 Index stats:', {
        dimension: stats.dimension,
        totalVectorCount: stats.totalRecordCount,
        namespaces: Object.keys(stats.namespaces || {}),
      });
    } else {
      console.log(`📝 Creating index "${indexName}"...`);
      
      await pinecone.createIndex({
        name: indexName,
        dimension: 1536, // OpenAI text-embedding-3-small dimension
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });

      console.log('⏳ Waiting for index to be ready...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      console.log(`✅ Index "${indexName}" created successfully!`);
    }

    console.log('\n✨ Pinecone initialization complete!');
    console.log(`\nYou can now use the AI analytics system with:`);
    console.log(`- Index Name: ${indexName}`);
    console.log(`- Dimension: 1536`);
    console.log(`- Metric: cosine`);
    console.log(`- Cloud: AWS (us-east-1)`);

  } catch (error) {
    console.error('❌ Error initializing Pinecone:', error.message);
    console.error('\nPlease check:');
    console.error('1. PINECONE_API_KEY is set correctly in .env');
    console.error('2. You have internet connection');
    console.error('3. Your Pinecone account is active');
    process.exit(1);
  }
}

initializePinecone();

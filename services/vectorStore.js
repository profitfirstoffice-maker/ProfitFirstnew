import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { Document } from '@langchain/core/documents';

class VectorStoreService {
  constructor() {
    this.pinecone = null;
    this.index = null;
    this.embeddings = null;
    this.vectorStore = null;
  }

  async initialize() {
    if (this.vectorStore) return this.vectorStore;

    try {
      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });

      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: 'text-embedding-3-small',
      });

      const indexName = process.env.PINECONE_INDEX_NAME || 'profitfirst-analytics';
      
      // Check if index exists, create if not
      const existingIndexes = await this.pinecone.listIndexes();
      const indexExists = existingIndexes.indexes?.some(idx => idx.name === indexName);

      if (!indexExists) {
        await this.pinecone.createIndex({
          name: indexName,
          dimension: 1536,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      this.index = this.pinecone.Index(indexName);
      
      this.vectorStore = await PineconeStore.fromExistingIndex(this.embeddings, {
        pineconeIndex: this.index,
      });

      console.log('✅ Vector store initialized successfully');
      return this.vectorStore;
    } catch (error) {
      console.error('❌ Vector store initialization error:', error.message);
      throw error;
    }
  }

  async storeBusinessContext(userId, data) {
    try {
      await this.initialize();

      const documents = [
        new Document({
          pageContent: `Business metrics for ${data.brandName}: Revenue ${data.revenue}, Orders ${data.orders}, AOV ${data.aov}, COGS ${data.cogs}, Gross Profit ${data.grossProfit}, Ad Spend ${data.adSpend}, Shipping Cost ${data.shippingCost}, Net Profit ${data.netProfit}, ROAS ${data.roas}`,
          metadata: {
            userId,
            type: 'business_metrics',
            timestamp: new Date().toISOString(),
            ...data,
          },
        }),
        new Document({
          pageContent: `Customer insights: Total customers ${data.totalCustomers}, New customers ${data.newCustomers}, Returning customers ${data.returningCustomers}, Returning rate ${data.returningRate}%`,
          metadata: {
            userId,
            type: 'customer_insights',
            timestamp: new Date().toISOString(),
          },
        }),
        new Document({
          pageContent: `Shipping data: Total shipments ${data.totalShipments}, Delivered ${data.delivered}, In-transit ${data.inTransit}, RTO ${data.rto}, NDR ${data.ndr}`,
          metadata: {
            userId,
            type: 'shipping_data',
            timestamp: new Date().toISOString(),
          },
        }),
      ];

      await this.vectorStore.addDocuments(documents);
      console.log(`✅ Stored business context for user ${userId}`);
    } catch (error) {
      console.error('❌ Error storing business context:', error.message);
    }
  }

  async queryContext(userId, query, k = 5) {
    try {
      await this.initialize();

      const results = await this.vectorStore.similaritySearch(query, k, {
        userId,
      });

      return results.map(doc => ({
        content: doc.pageContent,
        metadata: doc.metadata,
      }));
    } catch (error) {
      console.error('❌ Error querying context:', error.message);
      return [];
    }
  }
}

export default new VectorStoreService();

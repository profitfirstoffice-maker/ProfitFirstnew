import express from 'express';
import dotenv from 'dotenv';
import mainroute from './routes/mainroute.js';
import db from './db/mongodb.js';
import path from 'path';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import querystring from 'querystring';
import { startDataSync } from './jobs/dataSyncJob.js';

dotenv.config();
const app = express();
const port = process.env.PORT || 10000;

// Get __dirname equivalent in ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
app.use(cors());
app.use(bodyParser.json());
// API routes
app.use('/api', mainroute);

// Serve static files
app.use(express.static(path.join(__dirname, './client/dist')));


app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, './client/dist/index.html'));
});
// import { BetaAnalyticsDataClient } from '@google-analytics/data';

// const client = new BetaAnalyticsDataClient({
//   keyFilename: path.join(__dirname, 'ga-data-key.json'),
// });
// // profit-first@original-brace-460308-v8.iam.gserviceaccount.com

// async function runReport() {
//   const PROPERTY_ID = '458614630';
//   const [response] = await client.runReport({
//     property: `properties/${PROPERTY_ID}`,
//     dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
//     metrics: [
//       { name: 'activeUsers' },     
//       { name: 'sessions' },        
//       { name: 'screenPageViews' }, 
//     ],
//   });

//   if (!response.rows?.length) {
//     console.log('No data returned');
//     return;
//   }
//   const metricValues = response.rows[0].metricValues.map(mv => Number(mv.value));
//   const [users, sessions, pageViews] = metricValues;

//   console.log(`Users: ${users}, Sessions: ${sessions}, Page Views: ${pageViews}`);
//   const totalUsersAcrossAll = response.rows
//     .reduce((sum, row) => sum + Number(row.metricValues[0].value), 0);
//   console.log(`Total users (summed across all segments): ${totalUsersAcrossAll}`);
// }

// runReport().catch(console.error);

// Start server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
  console.log('🚀 Starting automatic data sync...');
  startDataSync(); // Auto-sync every 30 minutes
});

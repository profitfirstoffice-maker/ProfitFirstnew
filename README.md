# Profit First - D2C Analytics Platform

A comprehensive analytics and AI-powered insights platform for D2C (Direct-to-Consumer) brands. Track revenue, orders, profit margins, ad performance, and get AI-driven business recommendations.

## 🚀 Features

- **Real-time Dashboard**: Track revenue, orders, profit margins, ROAS, and more
- **AI Chatbot**: Ask questions about your business data in natural language
- **Predictive Analytics**: Get forecasts for revenue, profit, and trends
- **Multi-Platform Integration**: 
  - Shopify (Orders & Revenue)
  - Meta Ads (Ad Spend & ROAS)
  - Shiprocket (Shipping & Delivery)
  - Google Analytics (Traffic & Conversions)
- **Automated Data Sync**: Background jobs sync data every 30 minutes
- **Product Cost Management**: Track COGS and manufacturing costs
- **Marketing Analytics**: Monitor ad performance and ROI

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- API Credentials:
  - Shopify Store (Access Token & Store URL)
  - Meta Ads (Access Token & Ad Account ID)
  - Shiprocket (API Token)
  - Google Analytics (Service Account Key)
  - OpenAI API Key (for AI features)
  - Pinecone API Key (for vector storage)

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Aniket17200/Profitfirst.git
cd Profitfirst
```

### 2. Install Backend Dependencies
```bash
npm install
```

### 3. Install Frontend Dependencies
```bash
cd client
npm install
cd ..
```

### 4. Environment Setup

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/profitfirst
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/profitfirst

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this

# OpenAI API (for AI Chatbot)
OPENAI_API_KEY=sk-your-openai-api-key

# Pinecone (for Vector Storage)
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=your-pinecone-environment
PINECONE_INDEX_NAME=profitfirst-analytics

# Google Analytics (Optional)
# Place your ga-data-key.json file in the root directory

# Email Configuration (Optional)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:5173
```

### 5. Google Analytics Setup (Optional)

If using Google Analytics:
1. Create a service account in Google Cloud Console
2. Download the JSON key file
3. Rename it to `ga-data-key.json`
4. Place it in the root directory

## 🚀 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
npm run dev
# OR
node index.js
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

The application will be available at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`

### Production Mode

**Build Frontend:**
```bash
cd client
npm run build
cd ..
```

**Start Server:**
```bash
npm start
# OR
node index.js
```

The application will serve the built frontend at `http://localhost:3000`

## 📁 Project Structure

```
Profitfirst/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── context/         # React context
│   │   └── App.jsx          # Main app component
│   └── package.json
├── controller/               # Route controllers
│   ├── profitfirst/         # Business logic controllers
│   ├── chatImproved.js      # AI chat controller
│   └── chatTest.js          # Test endpoint
├── services/                # Business services
│   ├── aiOrchestrator.js    # AI orchestration
│   ├── dataAggregator.js    # Data aggregation
│   ├── predictionService.js # ML predictions
│   ├── vectorStore.js       # Pinecone integration
│   └── dashboardDataExtractor.js
├── routes/                  # API routes
│   ├── mainroute.js
│   ├── profitroute.js
│   └── authroute.js
├── middleware/              # Express middleware
│   └── auth.js
├── models/                  # MongoDB models
├── jobs/                    # Background jobs
│   └── dataSyncJob.js      # Auto data sync
├── scripts/                 # Utility scripts
│   └── initPinecone.js     # Initialize vector DB
├── db/                      # Database connection
│   └── mongodb.js
├── .env                     # Environment variables
├── index.js                 # Server entry point
└── package.json
```

## 🧪 Testing

### Test AI Chatbot
```bash
# Make sure server is running first
node test-ai-market-questions.js
```

### Interactive AI Testing
```bash
node test-ai-interactive.js
```

### Test Dashboard Data
```bash
node verify-dashboard.js
```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify token

### Dashboard
- `GET /api/data/dashboard` - Get dashboard data
- `GET /api/data/analytics` - Get analytics data
- `GET /api/data/analyticschart` - Get chart data

### AI Chat
- `POST /api/data/ai/init` - Initialize AI chat session
- `POST /api/data/ai/chat` - Send message to AI
- `GET /api/data/ai/insights` - Get business insights
- `POST /api/data/ai/test` - Test endpoint (no auth)

### Marketing
- `GET /api/data/marketingData` - Get marketing metrics

### Shipping
- `GET /api/data/shipping` - Get shipping data

### Products
- `GET /api/data/all-with-costs` - Get products with costs
- `POST /api/data/update-costs` - Update product costs

## 🤖 AI Features

### Supported Question Types

**Current Data:**
- "What is the current total revenue?"
- "Show me today's gross profit margin"
- "What are the current market trends?"

**Past Data:**
- "What was the revenue last month?"
- "Show me the profit trends for the last 6 months"
- "How did we perform in Q1 2024?"

**Future Predictions:**
- "What will be the revenue next month?"
- "Predict the gross profit for next quarter"
- "Will revenue increase or decrease?"

**Comparisons:**
- "Compare last month, this month, and next month revenue"
- "Show me the complete revenue trend"

## 🔧 Configuration

### Data Sync Interval
Edit `jobs/dataSyncJob.js` to change sync frequency:
```javascript
const SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes
```

### AI Model Configuration
Edit `services/aiOrchestrator.js`:
```javascript
modelName: 'gpt-4-turbo-preview',
temperature: 0.2,
maxTokens: 300,
```

## 🐛 Troubleshooting

### Server won't start
- Check if MongoDB is running
- Verify `.env` file exists and has correct values
- Check if port 3000 is available

### AI Chat not working
- Verify `OPENAI_API_KEY` in `.env`
- Check if Pinecone is configured correctly
- Restart server after changing `.env`

### Data not syncing
- Check API credentials in user onboarding
- Verify external API access (Shopify, Meta, Shiprocket)
- Check server logs for errors

### Frontend build fails
```bash
cd client
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📦 Dependencies

### Backend
- Express.js - Web framework
- MongoDB/Mongoose - Database
- OpenAI - AI chat
- LangChain - AI orchestration
- Pinecone - Vector database
- Axios - HTTP client
- JWT - Authentication

### Frontend
- React - UI framework
- Vite - Build tool
- React Router - Routing
- Axios - API calls
- Recharts - Data visualization

## 🔐 Security

- JWT-based authentication
- Password hashing with bcrypt
- Environment variables for secrets
- CORS configuration
- Input validation
- Rate limiting (recommended for production)

## 🚀 Deployment

### Backend (Node.js)
- Deploy to: Heroku, Railway, Render, DigitalOcean
- Set environment variables
- Configure MongoDB Atlas
- Enable auto-scaling

### Frontend (React)
- Build: `cd client && npm run build`
- Deploy to: Vercel, Netlify, Cloudflare Pages
- Or serve from backend (already configured)

## 📄 License

MIT License - feel free to use this project for your own purposes.

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📞 Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/Aniket17200/Profitfirst/issues)
- Email: support@profitfirst.com

## 🎯 Roadmap

- [ ] Multi-currency support
- [ ] Advanced ML predictions
- [ ] Custom report builder
- [ ] Mobile app
- [ ] Webhook integrations
- [ ] Team collaboration features
- [ ] White-label solution

## 📊 Screenshots

### Dashboard
![Dashboard](docs/dashboard.png)

### AI Chatbot
![AI Chat](docs/ai-chat.png)

### Analytics
![Analytics](docs/analytics.png)

---

**Built with ❤️ for D2C brands**

For detailed documentation, see the `/docs` folder.

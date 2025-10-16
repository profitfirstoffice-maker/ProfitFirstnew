# 🚀 Quick Setup Guide

## Step-by-Step Installation

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/Aniket17200/Profitfirst.git
cd Profitfirst

# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### 2. Environment Configuration

Create `.env` file in root directory:

```env
# Required
PORT=3000
MONGODB_URI=mongodb://localhost:27017/profitfirst
JWT_SECRET=your-secret-key-change-this
OPENAI_API_KEY=sk-your-openai-key

# Optional (for full features)
PINECONE_API_KEY=your-pinecone-key
PINECONE_ENVIRONMENT=your-environment
PINECONE_INDEX_NAME=profitfirst-analytics
```

### 3. Database Setup

**Option A: Local MongoDB**
```bash
# Install MongoDB
# Windows: Download from mongodb.com
# Mac: brew install mongodb-community
# Linux: sudo apt-get install mongodb

# Start MongoDB
mongod
```

**Option B: MongoDB Atlas (Cloud)**
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

### 4. Get API Keys

#### OpenAI (Required for AI Chat)
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create account / Login
3. Go to API Keys
4. Create new key
5. Copy to `.env` as `OPENAI_API_KEY`

#### Pinecone (Optional - for better AI)
1. Go to [pinecone.io](https://www.pinecone.io)
2. Create free account
3. Create index named `profitfirst-analytics`
4. Copy API key and environment to `.env`

### 5. Run the Application

**Development Mode (2 terminals):**

Terminal 1 - Backend:
```bash
npm run dev
```

Terminal 2 - Frontend:
```bash
cd client
npm run dev
```

**Production Mode:**
```bash
# Build frontend
cd client
npm run build
cd ..

# Start server (serves both backend and frontend)
npm start
```

### 6. Access the Application

- Frontend: http://localhost:5173 (dev) or http://localhost:3000 (prod)
- Backend API: http://localhost:3000

### 7. Create Account

1. Go to http://localhost:5173
2. Click "Sign Up"
3. Fill in details
4. Complete onboarding steps:
   - Step 1: Business info
   - Step 2: Shopify credentials
   - Step 3: Google Analytics (optional)
   - Step 4: Meta Ads credentials
   - Step 5: Shiprocket credentials

## 🧪 Test the Setup

### Test Backend
```bash
# In browser or Postman
GET http://localhost:3000/api/auth/verify
```

### Test AI Chat
```bash
# Make sure server is running
node test-ai-market-questions.js
```

### Test Dashboard
```bash
node verify-dashboard.js
```

## 🔧 Common Issues

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### MongoDB Connection Error
- Check if MongoDB is running
- Verify `MONGODB_URI` in `.env`
- For Atlas: Check IP whitelist

### OpenAI API Error
- Verify API key is correct
- Check if you have credits
- Ensure no extra spaces in `.env`

### Frontend Won't Start
```bash
cd client
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## 📦 Package Scripts

```bash
# Backend
npm start          # Start production server
npm run dev        # Start development server with nodemon

# Frontend (from /client directory)
npm run dev        # Start Vite dev server
npm run build      # Build for production
npm run preview    # Preview production build
```

## 🎯 Next Steps

1. ✅ Complete user onboarding
2. ✅ Connect your Shopify store
3. ✅ Add Meta Ads credentials
4. ✅ Configure Shiprocket
5. ✅ Wait for data sync (30 mins)
6. ✅ Explore dashboard
7. ✅ Try AI chatbot

## 📚 Additional Resources

- [Full Documentation](README.md)
- [API Documentation](docs/API.md)
- [AI Features Guide](AI_QUICK_REFERENCE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## 🆘 Need Help?

- Check [GitHub Issues](https://github.com/Aniket17200/Profitfirst/issues)
- Read [FAQ](docs/FAQ.md)
- Contact support

---

**Setup Time: ~15 minutes**

Happy analyzing! 🚀

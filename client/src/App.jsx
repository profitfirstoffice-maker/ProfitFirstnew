import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useState } from "react";
import Homepage from "./pages/Homepage";
import Contactus from "./pages/Contactus";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ScrollToTop from "./utils/ScrollToTop";
import { ToastContainer } from "react-toastify";
import VerifyEmail from "./pages/VerifyEmail";
import Onboarding from "./pages/Onboarding";
import { isTokenValid } from "./utils/auth";
import Dashboard from "./pages/Dashboard";
import MainDashboard from "./MainDashboard";
import Marketing from "./pages/Marketing";
import Analytics from "./pages/Analytics";
import Shipping from "./pages/Shipping";
import Products from "./pages/Products";
import Returns from "./pages/Returns";
import Blogs from "./pages/Blogs";
import PrivacyPolicy from "./components/privacypolicy";
import RetryPage from "./pages/RetryPage";
import Settings from "./pages/Settings";
import ChatBot from "./pages/ChatBot";
import { TbMessageChatbotFilled } from "react-icons/tb";
import chatbott from "./public/WelcomeAnimation.gif";
import Customerstory from "./pages/Customerstory";
import Profitcalculater from "./components/Profitcalculater";
import Aiprediction from "./pages/Aiprediction";
function AppWrapper() {
  const isAuthenticated = isTokenValid();
  // const isAuthenticated = true;
  const location = useLocation();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAiPredictionOpen, setIsAiPredictionOpen] = useState(false);

  const isDashboardRoute = location.pathname.startsWith("/dashboard");

  const toggleChat = () => setIsChatOpen((prev) => !prev);
  const toggleAiPrediction = () => setIsAiPredictionOpen((prev) => !prev);
  return (
    <>
      <ScrollToTop />
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/ourstorys" element={<Customerstory />} />
        {/* <Route path="/aiprediction" element={<Aiprediction />} /> */}
        <Route path="/Profitcalculater" element={<Profitcalculater />} />
        <Route path="/contact" element={<Contactus />} />
        <Route path="/blogs" element={<Blogs />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/retry" element={<RetryPage />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route
          path="/onboarding"
          element={
            isAuthenticated ? <Onboarding /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <MainDashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="marketing" element={<Marketing />} />
          <Route path="shipping" element={<Shipping />} />
          <Route path="products" element={<Products />} />
          <Route path="returns" element={<Returns />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Homepage />} />
      </Routes>

      {/* Floating ChatBot Button & Popup (Visible on dashboard routes only) */}

      {isDashboardRoute && (
        <>
          <button
            onClick={toggleAiPrediction}
            style={{
              position: "fixed",
              bottom: "200px",
              right: "80px",
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              zIndex: 9,
              cursor: "pointer",
              boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="AI Prediction"
             className="glass p-2"
          >
            <img height={50} src="https://res.cloudinary.com/dqdvr35aj/image/upload/v1758202446/Rocket_3_1_kgk5ac.png" alt="AI Prediction" />
          </button>

          {isAiPredictionOpen && (
            <div
              style={{
                position: "fixed",
                top: "50%",
                left: "58%",
                transform: "translate(-50%, -50%)",
                width: "100%",
                maxWidth: "1250px",
                height: "90vh",
                backgroundColor: "rgba(15, 23, 42, 0.9)",
                borderRadius: "20px",
                zIndex: 10,
                boxShadow: "0 4px 22px rgba(0,0,0,0.3)",
                overflow: "hidden",
                border: "2px solid #334155",
              }}
            >
              <div className="fixed inset-0 z-50 bg-black/60 overflow-y-auto custom-scrollbar">
                <Aiprediction onClose={() => setIsAiPredictionOpen(false)} />
              </div>
            </div>
          )}

          <button
            onClick={toggleChat}
            style={{
              position: "fixed",
              bottom: "50px",
              right: "80px",
              // backgroundColor: "#0bcf04",
              color: "white",
              border: "none",
              borderRadius: "50%",
              width: "80px",
              height: "80px",
              fontSize: "24px",
              zIndex: 9,
              cursor: "pointer",
              boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Chat with us"
                         className="glass p-2"

          >
            <img height={50} src="https://res.cloudinary.com/dqdvr35aj/image/upload/v1758202446/Chatbot_g5uze2.png" alt="Chatbot" />

            {/* <TbMessageChatbotFilled /> */}
          </button>

          {isChatOpen && (
            <div
              style={{
                position: "fixed",
                bottom: "20px",
                right: "60px",
                width: "400px",
                height: "650px",
                backgroundColor: "white",
                borderRadius: "20px",
                zIndex: 9,
                boxShadow: "0 4px 22px rgba(0,0,0,0.3)",
                overflow: "hidden",
              }}
            >
              <ChatBot onClose={() => setIsChatOpen(false)} />
            </div>
          )}
        </>
      )}
    </>
  );
}

function App() {
  return (
    <Router>
      <AppWrapper />
    </Router>
  );
}

export default App;

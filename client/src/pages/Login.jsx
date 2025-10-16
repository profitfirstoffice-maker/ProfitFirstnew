import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { PulseLoader } from "react-spinners";
import { FiArrowLeft } from "react-icons/fi";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [firstTimeToast, setFirstTimeToast] = useState(false);

  useEffect(() => {
    if (firstTimeToast) {
      toast.success(
        "We’ve sent your ProfitFirst sign-in details to your registered email. Open your inbox to complete setup and start using ProfitFirst."
      );
      setFirstTimeToast(false);
    }
  }, [firstTimeToast]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { email, password } = formData;
    if (!email || !password) {
      toast.error("Please fill in all fields.");
      setLoading(false);
      return;
    }

    try {
      const response = await axiosInstance.post("/auth/login", {
        email,
        password,
      });
      const token = response.data.token;
      const userId = response.data.userId;
      localStorage.setItem("token", token);
      localStorage.setItem("userId", userId);

      toast.success("Login successful!");

      const userRes = await axiosInstance.get(`/auth/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const isAdmin = userRes.data?.isAdmin;
      navigate(isAdmin ? "/admindashboard" : "/onboarding");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0D191C] relative">
        <PulseLoader size={15} color="#12EB8E" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#101218] text-white relative overflow-hidden">
      <style>{`
        .bg-blob {
          position: absolute;
          width: 380px;
          height: 380px;
          filter: blur(80px);
          opacity: 0.14;
          z-index: 0;
          border-radius: 50%;
        }
        .blob-left { left: -120px; top: 100%; background: #5fc61fff; transform: translateY(-50%); }
        .blob-right { right: -120px; top: 0%; background: #5fc61fff; transform: translateY(0%); }
      `}</style>
      <div className="bg-blob blob-left"></div>
      <div className="bg-blob blob-right"></div>

      <ToastContainer position="top-right" autoClose={3000} />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="bg-[#1E1E1E] rounded-2xl p-6 shadow-lg">
          {/* Header with back arrow */}
          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Back"
              className="p-1 rounded-full hover:bg-white/5 transition"
            >
              <FiArrowLeft size={20} />
            </button>
            <h2 className="text-2xl font-semibold">Log In</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="text-xs text-gray-300 block mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="example@gmail.com"
                className="w-full rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="text-xs text-gray-300 block mb-2"
              >
                Enter your password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="********"
                  className="w-full rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-300">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  className="accent-green-400 h-4 w-4 mr-2"
                />
                Remember Me.
              </label>
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-sm text-gray-300 hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black py-2 rounded-full font-semibold hover:opacity-95 transition"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </div>

            {/* sign up hint */}
            <div className="text-center text-xs text-gray-400 mt-2">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/signup")}
                className="text-white font-medium underline"
              >
                Sign Up
              </button>
            </div>

            {/* social follow area (small icons) */}
            <div className="mt-4 text-xs text-gray-400">
              <span className="mr-2">FOLLOW:</span>
              <span className="inline-flex items-center space-x-2">
                <span className="w-5 h-5 rounded-sm bg-white inline-block"></span>
                <span className="w-5 h-5 rounded-sm bg-white inline-block"></span>
                <span className="w-5 h-5 rounded-sm bg-white inline-block"></span>
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

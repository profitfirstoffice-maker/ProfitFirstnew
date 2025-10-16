import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axiosInstance from "../../axios";
import { useNavigate } from "react-router-dom";
import { PulseLoader } from "react-spinners";
import { FiArrowLeft } from "react-icons/fi";
import axios from "axios";
import { useGoogleLogin } from "@react-oauth/google";

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48">
    <path
      fill="#FFC107"
      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.804 8.841C34.522 4.938 29.521 2.5 24 2.5C11.454 2.5 2.5 11.454 2.5 24s8.954 21.5 21.5 21.5S45.5 36.546 45.5 24c0-1.573-.154-3.097-.439-4.561z"
    />
    <path
      fill="#FF3D00"
      d="M6.306 14.691L12.05 19.12C14.473 14.018 18.907 10.5 24 10.5c3.059 0 5.842 1.154 7.961 3.039L38.804 8.841C34.522 4.938 29.521 2.5 24 2.5C16.318 2.5 9.642 6.713 6.306 12.691z"
    />
    <path
      fill="#4CAF50"
      d="M24 45.5c5.521 0 10.522-2.438 14.804-6.359L32.039 32.84c-2.119 2.885-5.41 4.66-9.039 4.66c-5.093 0-9.527-3.518-11.95-8.62L6.306 33.309C9.642 39.287 16.318 43.5 24 43.5z"
    />
    <path
      fill="#1976D2"
      d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l7.764 6.203C42.818 36.142 45.5 30.492 45.5 24c0-1.573-.154-3.097-.439-4.561z"
    />
  </svg>
);

const SignUp = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    rePassword: "",
    terms: false,
  });
  const [step, setStep] = useState(1); // Track step (1 or 2)
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === "checkbox" ? checked : value,
    }));
  };

  const handleGoogleSignup = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        // Fetch user information from Google
        const userInfoResponse = await axios.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          }
        );

        const { given_name: firstName, family_name: lastName, email } = userInfoResponse.data;

        const response = await axiosInstance.post("/auth/google-signup", {
          firstName,
          lastName,
          email,
        });

        toast.success(response.data.message);
        navigate("/login");
      } catch (error) {
        toast.error(error.response?.data?.message || "Google Signup failed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      toast.error("Google Signup failed. Please try again.");
    },
  });

  const handleSubmitStepOne = () => {
    if (!formData.firstName || !formData.lastName) {
      toast.error("Please fill in all fields.");
      return;
    }
    setStep(2);
  };

  const handleSubmitStepTwo = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.rePassword) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (!formData.terms) {
      toast.error("Please accept the Terms of Service.");
      return;
    }
    if (formData.password !== formData.rePassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);

    try {
      const response = await axiosInstance.post("/auth/signup", {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
      });
      toast.success("Signup successful! Please check your email for verification.");
      navigate("/verify-email", { state: { email: formData.email } });
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0D1D1E]">
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

      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="bg-[#1E1E1E] rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Back"
              className="p-1 rounded-full hover:bg-white/5 transition"
            >
              <FiArrowLeft size={20} />
            </button>
            <h2 className="text-2xl font-semibold text-white">Sign Up</h2>
          </div>

          {step === 1 ? (
            <>
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="mb-4">
                  <label htmlFor="firstName" className="text-xs text-gray-300 block mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-white text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-green-400"
                    placeholder="John"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="lastName" className="text-xs text-gray-300 block mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-white text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-green-400"
                    placeholder="Doe"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSubmitStepOne}
                  className="w-full bg-white text-black py-2 rounded-full font-semibold hover:opacity-95 transition"
                >
                  Next
                </button>
 <div className="flex items-center my-6">
    <hr className="flex-grow border-t border-gray-600" />
    <span className="px-4 text-white text-sm">or</span>
    <hr className="flex-grow border-t border-gray-600" />
  </div>


                 <div className="flex flex-col sm:flex-row mb-4 mt-4">
                  <button
                    type="button"
                    onClick={() => handleGoogleSignup()}
                    className="flex-1 py-2.5 flex items-center justify-center text-white rounded-md transition-colors border border-[#12EB8E] hover:bg-[#12EB8E] hover:text-black font-semibold"
                  >
                    <GoogleIcon />
                    Sign up with Google
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <form onSubmit={handleSubmitStepTwo}>
                <div className="mb-4">
                  <label htmlFor="email" className="text-xs text-gray-300 block mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-white text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-green-400"
                    placeholder="john.doe@example.com"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="password" className="text-xs text-gray-300 block mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-white text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-green-400"
                    placeholder="••••••••"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="rePassword" className="text-xs text-gray-300 block mb-2">
                    Re-enter Password
                  </label>
                  <input
                    type="password"
                    id="rePassword"
                    value={formData.rePassword}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-white text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-green-400"
                    placeholder="••••••••"
                  />
                </div>

                <div className="mb-6 flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={formData.terms}
                    onChange={handleChange}
                    className="h-5 w-5 text-green-400 accent-green-400 focus:ring-green-400 mt-1"
                  />
                  <label htmlFor="terms" className="text-xs text-gray-300 block mb-2">
                    I’ve read and agree with Terms of Service and Privacy Policy
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full bg-white text-black py-2 rounded-full font-semibold hover:opacity-95 transition"
                >
                  Sign Up
                </button>

               
              </form>
            </>
          )}

          <p className="text-center text-sm text-gray-400 mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-green-400 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;

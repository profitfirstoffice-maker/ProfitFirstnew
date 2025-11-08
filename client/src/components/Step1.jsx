import React, { useState } from "react";
import axiosInstance from "../../axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { PulseLoader } from "react-spinners";
import { FiArrowLeft } from "react-icons/fi";

const Step1 = ({ onComplete }) => {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    whatsapp: "",
    industry: "",
    referral: "",
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitStepOne = () => {
    // Validate required fields for step 1
    if (!form.fullName || !form.email || !form.phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(form.phone)) {
      toast.error("Please enter a valid phone number.");
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate required fields for step 2
    const { whatsapp, industry } = form;
    if (!whatsapp || !industry) {
      toast.error("Please fill in all required details");
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.post("/onboard/step1", form);
      toast.success("Step 1 completed successfully!");
      onComplete && onComplete();
      // reset form
      setForm({
        fullName: "",
        email: "",
        phone: "",
        whatsapp: "",
        industry: "",
        referral: "",
      });
    } catch (err) {
      console.error("Submission error:", err);
      toast.error("Failed to complete Step 1. Please try again.");
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

      <div className="bg-blob blob-left" />
      <div className="bg-blob blob-right" />

      <ToastContainer position="top-right" autoClose={3000} />

      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="bg-[#1E1E1E] rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={() => (step === 2 ? setStep(1) : null)}
              aria-label="Back"
              className={`p-1 rounded-full hover:bg-white/5 transition ${step === 1 ? "hidden" : ""}`}
            >
              <FiArrowLeft size={20} />
            </button>

            <h2 className="text-2xl font-semibold text-white">Tell us about yourself</h2>
          </div>

          {step === 1 ? (
            <>
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="mb-4">
                  <label htmlFor="fullName" className="text-xs text-gray-300 block mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-white text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-green-400"
                    placeholder="John Doe"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="email" className="text-xs text-gray-300 block mb-2">
                    Work Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-white text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-green-400"
                    placeholder="john.doe@example.com"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="phone" className="text-xs text-gray-300 block mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-white text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-green-400"
                    placeholder="9876543210"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSubmitStepOne}
                  className="w-full bg-white text-black py-2 rounded-full font-semibold hover:opacity-95 transition"
                >
                  Next
                </button>
              </form>
            </>
          ) : (
            <>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="whatsapp" className="text-xs text-gray-300 block mb-2">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    id="whatsapp"
                    name="whatsapp"
                    value={form.whatsapp}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-white text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-green-400"
                    placeholder="9876543210"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="industry" className="text-xs text-gray-300 block mb-2">
                    Industry
                  </label>
                  <select
                    id="industry"
                    name="industry"
                    value={form.industry}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-white text-white bg-[#1E1E1E] focus:outline-none focus:ring-2 focus:ring-green-400"
                  >
                    <option value="">Select Industry</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="Technology">Technology</option>
                    <option value="Health & Wellness">Health & Wellness</option>
                    <option value="Finance">Finance</option>
                    <option value="Education">Education</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="mb-6">
                  <label htmlFor="referral" className="text-xs text-gray-300 block mb-2">
                    Where did you hear about Profit First
                  </label>
                  <select
                    id="referral"
                    name="referral"
                    value={form.referral}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-white text-white bg-[#1E1E1E] focus:outline-none focus:ring-2 focus:ring-green-400"
                  >
                    <option value="">Select</option>
                    <option value="Google Search">Google Search</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Friend or Colleague">Friend or Colleague</option>
                    <option value="Event or Webinar">Event or Webinar</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-white text-black py-2 rounded-full font-semibold hover:opacity-95 transition"
                >
                  Done
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Step1;

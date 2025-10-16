import React, { useState } from "react";
import axiosInstance from "../../axios";
import { toast } from "react-toastify";
import { PulseLoader } from "react-spinners";

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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { fullName, email, phone, whatsapp, industry } = form;
    if (!fullName || !email || !phone || !whatsapp || !industry) {
      toast.error("Please fill in all required details");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    const phoneRegex = /^[6-9]\d{9}$/;
    if(!phoneRegex.test(phone)){
      toast.error("Please enter a valid phone number.");
      return;
    }

    setLoading(true); // Start loading
    try {
      await axiosInstance.post("/onboard/step1", form);
      toast.success("Step 1 completed successfully!");
      onComplete(); // only go next on success
      setForm({
        fullName: "",
        email: "",
        phone: "",
        whatsapp: "",
        industry: "",
        referral: "",
      });
      setLoading(false); // Stop loading
    } catch (err) {
      toast.error("Failed to complete Step 1. Please try again.");
      console.error("Submission error:", err);
      setLoading(false); // Stop loading even on error
    }
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0D1D1E]">
        <PulseLoader size={60} color="#12EB8E" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6"
      style={{
        background:
          "linear-gradient(to bottom, rgb(0, 40, 38), rgb(0, 85, 58))",
      }}
    >
      <div className="bg-[#0D191C] text-white rounded-3xl shadow-2xl flex flex-col lg:flex-row w-full max-w-6xl overflow-hidden">
        <div className="w-full lg:w-1/2 p-6 sm:p-10 flex flex-col justify-center text-center lg:text-left">
          <div className="flex justify-center lg:justify-start mb-6">
            <img className="w-48 sm:w-64" src="https://res.cloudinary.com/dqdvr35aj/image/upload/v1748330108/Logo1_zbbbz4.png" alt="profit first" />
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-semibold text-[#12EB8E] leading-tight">
            Let us find <br /> more about <br /> you...
          </h1>
        </div>

        {/* Form Section */}
        <div className="w-full lg:w-1/2 p-6 sm:p-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
              <div className="w-full sm:w-1/2">
                <label className="block text-sm mb-1">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-md bg-transparent border border-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="w-full sm:w-1/2">
                <label className="block text-sm mb-1">Work Mail</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-md bg-transparent border border-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Phone Number</label>
              <input
                type="tel"
                name="phone"    
                value={form.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-md bg-transparent border border-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Whats app Number</label>
              <input
                type="tel"
                name="whatsapp"
                value={form.whatsapp}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-md bg-transparent border border-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm mb-1 text-white">Industry</label>
              <select
                name="industry"
                value={form.industry}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-md bg-[#0D191C] border border-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select</option>
                <option value="E-commerce">E-commerce</option>
                <option value="Technology">Technology</option>
                <option value="Health & Wellness">Health & Wellness</option>
                <option value="Finance">Finance</option>
                <option value="Education">Education</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1 text-white">
                Where did you hear about Profit First
              </label>
              <select
                name="referral"
                value={form.referral}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-md bg-[#0D191C] border border-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
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

            <div>
              <button
                type="submit"
                className="w-full py-3 rounded-md hover:text-white transition duration-200 text-black font-semibold"
                style={{ backgroundColor: "#12EB8E" }}
              >
                Done
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Step1;

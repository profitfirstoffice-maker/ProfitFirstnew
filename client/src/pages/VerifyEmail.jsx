import React, { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate, Link } from "react-router-dom";
import axiosInstance from "../../axios";

const maskEmail = (email) => {
  const [user, domain] = email.split("@");
  return `${user[0]}*****@${domain}`;
};

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useParams();
  const [status, setStatus] = useState("loading");
  

  const maskedEmail = location.state?.email ? maskEmail(location.state.email) : "your email";

 useEffect(() => {
  let redirectTimeout;

  const verify = async () => {
    if (token) {
      try {
        await axiosInstance.get(`/auth/verify-email/${token}`);
        setStatus("success");
        redirectTimeout = setTimeout(() => {
          navigate("/login");
        }, 3000);
      } catch (err) {
        setStatus("error");
      }
    } else {
      setStatus("waiting");
    }
  };

  verify();

  return () => clearTimeout(redirectTimeout);
}, [token, navigate]);


  return (
    <div className="min-h-screen flex items-center justify-center" style={{
      background: 'linear-gradient(to bottom, rgb(0, 40, 38), rgb(0, 85, 58))',
    }}>
      <div className="bg-[#0f1e1c] rounded-3xl p-10 text-center shadow-lg w-2xl">
        <img src="https://res.cloudinary.com/dqdvr35aj/image/upload/v1748330108/Logo1_zbbbz4.png" alt="Logo" className="mx-auto h-64 mb-6" />
        
        {status === "waiting" && (
          <>
            <h2 className="text-white text-2xl font-bold mb-2">Verify your email</h2>
            <p className="text-gray-300">
              We've sent a verification email to <span className="text-green-400">{maskedEmail}</span>.<br />
              Please check your inbox and click the link to verify.
            </p>
            {/* link for login  */}
            <Link to="/login" className="text-green-500 mt-4 block">
              Go to Login
            </Link>
          
          </>
        )}

        {status === "success" && (
          <>
            <h2 className="text-green-400 text-2xl font-bold mb-2">Email Verified!</h2>
            <p className="text-gray-300">Redirecting you to login...</p>
          </>
        )}

        {status === "error" && (
          <>
            <h2 className="text-red-500 text-2xl font-bold mb-2">Verification Failed</h2>
            <p className="text-gray-300">The verification link is invalid or expired.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;

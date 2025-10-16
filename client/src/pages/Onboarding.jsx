import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../axios";
import { PulseLoader } from "react-spinners";
import Step1 from "../components/Step1";
import Step2 from "../components/Step2"; 
import Step3 from "../components/Step3";
import Step4 from "../components/Step4";
import Step5 from "../components/Step5";

const Onboarding = () => {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    axiosInstance
      .get("/onboard/step")
      .then((response) => {
        const step = response.data.step;
        if (step === 6) {
          navigate("/dashboard");
        } else {
          setCurrentStep(step);
        }
      })
      .catch((error) => {
        console.error("Error fetching onboarding step:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [navigate]);

  const handleStepComplete = () => {
    const next = currentStep + 1;
    if (next === 6) {
      navigate("/dashboard");
    } else {
      setCurrentStep(next);
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
    <div>
      {currentStep === 1 && <Step1 onComplete={handleStepComplete} />}
      {currentStep === 2 && <Step2 onComplete={handleStepComplete} />}
      {currentStep === 3 && <Step3 onComplete={handleStepComplete} />}
      {currentStep === 4 && <Step4 onComplete={handleStepComplete} />}
      {currentStep === 5 && <Step5 onComplete={handleStepComplete} />}
    </div>
  );
};

export default Onboarding;

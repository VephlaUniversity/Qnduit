import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../utils/api";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying");

  useEffect(() => {
    const verify = async () => {
      const reference = searchParams.get("reference");

      if (!reference) {
        setStatus("error");
        return;
      }

      try {
        await axios.get(
          `${API_BASE_URL}/api/employers/verify-payment?reference=${reference}`
        );

        setStatus("success");

        // redirect after 2 sec
        setTimeout(() => {
          navigate("/employer/dashboard");
        }, 2000);

      } catch (err) {
        console.error("Verification failed:", err);
        setStatus("error");
      }
    };

    verify();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      {status === "verifying" && <h1>Verifying payment...</h1>}
      {status === "success" && <h1>✅ Payment successful! Redirecting...</h1>}
      {status === "error" && <h1>❌ Payment verification failed</h1>}
    </div>
  );
};

export default PaymentSuccess;
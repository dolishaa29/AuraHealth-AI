import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Loader2 } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { authInput, authLabel, authButton, authMessage } from '../components/authStyles';

const Userregister = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !name || !contact || !address) {
      setMessage("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(import.meta.env.VITE_API_URL + "/userregister", {
        email, password, name, contact, address,
      });

      if (response.data.success) {
        setMessage("OTP sent to your email. Please verify.");
        setStep(2);
      } else {
        setMessage(response.data.msg || "Registration Failed");
      }
    } catch (err) {
      setMessage(err.response?.data?.msg || "Error while registering");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    if (!otp) {
      setMessage("Please enter the OTP");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(import.meta.env.VITE_API_URL + "/userregisterverify", {
        email, otp,
      });

      if (response.data.success) {
        setMessage("Registration Successful! Redirecting to login...");
        setTimeout(() => navigate("/login"), 1500);
      } else {
        setMessage(response.data.msg || "OTP verification failed");
      }
    } catch (err) {
      setMessage(err.response?.data?.msg || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      panelTitle="Your health, in one gentle place."
      panelText="Create your free patient account in a minute."
      points={["30 free AI credits to start", "Book verified doctors by video", "Reminders & SOS always free"]}
      title={step === 1 ? "Create your account" : "Check your email"}
      subtitle={step === 1 ? "Just a few details to get you started." : `We sent a 6-digit code to ${email}.`}
    >
      {step === 1 ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className={authLabel}>Full name
              <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required className={authInput} />
            </label>
            <label className={authLabel}>Email
              <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className={authInput} />
            </label>
          </div>
          <label className={authLabel}>Password
            <input type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} required className={authInput} />
          </label>
          <label className={authLabel}>Mobile number
            <PhoneInput defaultCountry="IN" placeholder="98765 43210" value={contact} onChange={setContact} className={`${authInput} flex items-center gap-2 [&_input]:bg-transparent [&_input]:outline-none [&_input]:flex-1`} />
          </label>
          <label className={authLabel}>Address
            <input type="text" placeholder="Street, city, PIN" value={address} onChange={(e) => setAddress(e.target.value)} required className={authInput} />
          </label>
          {message && <p className={authMessage(message)}>{message}</p>}
          <button type="submit" disabled={loading} className={authButton}>
            {loading && <Loader2 size={18} className="animate-spin" />} {loading ? "Sending code…" : "Create account"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleOtpVerify} className="flex flex-col gap-4">
          <label className={authLabel}>Verification code
            <input type="text" inputMode="numeric" maxLength={6} placeholder="6-digit code" value={otp} onChange={(e) => setOtp(e.target.value)} required className={`${authInput} text-center tracking-[0.5em] text-xl font-extrabold`} />
          </label>
          {message && <p className={authMessage(message)}>{message}</p>}
          <button type="submit" disabled={loading} className={authButton}>
            {loading && <Loader2 size={18} className="animate-spin" />} {loading ? "Verifying…" : "Verify & finish"}
          </button>
          <button type="button" onClick={() => { setStep(1); setMessage(""); setOtp(""); }} className="h-12 rounded-full bg-[#F6F6FD] text-[#4B4A6B] text-sm font-bold">
            Change my details
          </button>
        </form>
      )}
      <p className="text-center text-sm text-[#6B6A8A]">
        Already have an account? <button onClick={() => navigate('/login')} className="font-extrabold text-indigo-600 hover:text-indigo-700">Sign in</button>
      </p>
    </AuthShell>
  );
};

export default Userregister;

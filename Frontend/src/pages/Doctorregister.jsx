import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Loader2, Upload, CheckCircle2 } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { authInput, authLabel, authButton, authMessage } from '../components/authStyles';

const Doctorregister = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [certificate, setCertificate] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !name || !specialization || !contact || !address || !certificate) {
      setMessage("Please fill all fields and upload your certificate.");
      return;
    }

    setLoading(true);
    setMessage("");
    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("specialization", specialization);
    formData.append("contact", contact);
    formData.append("address", address);
    formData.append("certificate", certificate);

    try {
      const response = await axios.post(
        import.meta.env.VITE_API_URL + "/doctorpermission",
        formData
      );

      if (response.status === 201 || response.status === 200) {
        setMessage("success: Registration successful! Waiting for admin approval.");
        setCertificate(null);
      } else {
        setMessage(response.data.message || "Registration Failed");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Error while registering");
    } finally {
      setLoading(false);
    }
  };

  const done = message.startsWith("success:");
  const shownMessage = done ? message.replace("success: ", "") : message;

  return (
    <AuthShell
      panelTitle="Spend your day with patients, not paperwork."
      panelText="Join AuraHealth as a doctor. Our team checks your certificate, then patients can book you."
      points={["Organised appointment list", "AI briefing before each visit", "Video calls & secure chat"]}
      title={done ? "Application sent!" : "Join as a doctor"}
      subtitle={done ? "We'll email your login details once you're approved." : "Tell us about your practice."}
    >
      {done ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-5 rounded-[24px] bg-[#E7F7EF] text-[#05603A]">
            <span className="w-12 h-12 shrink-0 rounded-full bg-white flex items-center justify-center"><CheckCircle2 size={24} /></span>
            <p className="text-sm font-semibold">{shownMessage}</p>
          </div>
          <button onClick={() => navigate('/login')} className={authButton}>Go to sign in</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className={authLabel}>Full name
              <input type="text" placeholder="Dr. Your name" value={name} onChange={(e) => setName(e.target.value)} className={authInput} />
            </label>
            <label className={authLabel}>Email
              <input type="email" placeholder="you@clinic.com" value={email} onChange={(e) => setEmail(e.target.value)} className={authInput} />
            </label>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className={authLabel}>Specialty
              <input type="text" placeholder="e.g. Cardiology" value={specialization} onChange={(e) => setSpecialization(e.target.value)} className={authInput} />
            </label>
            <label className={authLabel}>Mobile number
              <PhoneInput defaultCountry="IN" placeholder="98765 43210" value={contact} onChange={setContact} className={`${authInput} flex items-center gap-2 [&_input]:bg-transparent [&_input]:outline-none [&_input]:flex-1 [&_input]:min-w-0`} />
            </label>
          </div>
          <label className={authLabel}>Clinic address
            <input type="text" placeholder="Street, city, PIN" value={address} onChange={(e) => setAddress(e.target.value)} className={authInput} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-bold">Medical certificate (PDF)
            <span className={`flex items-center gap-3 p-3 rounded-[22px] border-2 border-dashed cursor-pointer ${certificate ? "border-[#12B76A] bg-[#E7F7EF]" : "border-[#C4C1F5] bg-[#F6F6FD] hover:bg-[#EEEDFF]"}`}>
              <span className={`w-11 h-11 shrink-0 rounded-full bg-white flex items-center justify-center ${certificate ? "text-[#05603A]" : "text-indigo-600"}`}>{certificate ? <CheckCircle2 size={20} /> : <Upload size={20} />}</span>
              <span className="min-w-0 text-sm font-semibold text-[#4B4A6B] truncate">{certificate ? certificate.name : "Click to upload your certificate"}</span>
              <input type="file" accept=".pdf" onChange={(e) => setCertificate(e.target.files[0])} className="sr-only" />
            </span>
          </label>
          {shownMessage && <p className={authMessage(shownMessage)}>{shownMessage}</p>}
          <button type="submit" disabled={loading} className={authButton}>
            {loading && <Loader2 size={18} className="animate-spin" />} {loading ? "Sending…" : "Send application"}
          </button>
        </form>
      )}
      <p className="text-center text-sm text-[#6B6A8A]">
        Already approved? <button onClick={() => navigate('/login')} className="font-extrabold text-indigo-600 hover:text-indigo-700">Sign in</button>
      </p>
    </AuthShell>
  );
};

export default Doctorregister;

import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import AuthShell from "../components/AuthShell";
import { authInput, authLabel, authButton, authMessage } from "../components/authStyles";

const Adminregister = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !contact) {
      setMessage("Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(import.meta.env.VITE_API_URL + "/adminregister", { email, password, contact });
      setMessage(res.data.msg || "Admin registered successfully");
    } catch (err) {
      setMessage(err.response?.data?.msg || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      panelTitle="Set up the admin account."
      panelText="Admins verify doctors, approve appointments and keep AuraHealth running smoothly."
      title="Create admin account"
      subtitle="One-time setup for platform administrators."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className={authLabel}>Email
          <input type="email" placeholder="admin@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={authInput} />
        </label>
        <label className={authLabel}>Password
          <input type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} className={authInput} />
        </label>
        <label className={authLabel}>Phone
          <input type="text" placeholder="98765 43210" value={contact} onChange={(e) => setContact(e.target.value)} className={authInput} />
        </label>
        {message && <p className={authMessage(message)}>{message}</p>}
        <button type="submit" disabled={loading} className={authButton}>
          {loading && <Loader2 size={18} className="animate-spin" />} Create admin
        </button>
      </form>
      <button onClick={() => navigate("/login")} className="self-center h-11 px-5 rounded-full text-sm font-bold text-indigo-600 hover:bg-[#EEEDFF]">Go to sign in</button>
    </AuthShell>
  );
};

export default Adminregister;

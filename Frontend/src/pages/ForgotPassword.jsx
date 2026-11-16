import { useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { authInput, authLabel, authButton } from '../components/authStyles';

const ForgotPassword = () => {
    const { role } = useParams();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ msg: "", isError: false });

    const isUser = role === "user";
    const apiPath = isUser ? "/user" : "/doctor";

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ msg: "", isError: false });

        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}${apiPath}forgotpassword`,
                { email, role },

            );
            setStatus({ msg: response.data.msg || response.data.message || "OTP sent successfully!", isError: false });
            setStep(2);
        } catch (err) {
            setStatus({ msg: err.response?.data?.msg || err.response?.data?.message || "Failed to send OTP", isError: true });
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ msg: "", isError: false });

        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}${apiPath}verifyotp`,
                { email, otp, role },

            );
            setStatus({ msg: response.data.msg || response.data.message || "OTP Verified!", isError: false });
        } catch (err) {
            setStatus({ msg: err.response?.data?.msg || err.response?.data?.message || "Invalid OTP", isError: true });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            panelTitle="Locked out? It happens."
            panelText="We'll email you a one-time code. Once it's verified, your new password arrives by email too."
            points={["Takes about a minute", "Code works for 10 minutes", "Change it later from your profile"]}
            title={step === 1 ? "Reset your password" : "Enter your code"}
            subtitle={step === 1 ? `For your ${isUser ? "patient" : "doctor"} account.` : `We sent a 6-digit code to ${email}.`}
        >
            {status.msg && (
                <p className={`px-4 py-3 rounded-2xl text-sm font-semibold ${status.isError ? "bg-[#FFECEB] text-[#B42318]" : "bg-[#E7F7EF] text-[#05603A]"}`}>{status.msg}</p>
            )}

            {step === 1 ? (
                <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                    <label className={authLabel}>Email
                        <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className={authInput} />
                    </label>
                    <button type="submit" disabled={loading} className={authButton}>
                        {loading && <Loader2 size={18} className="animate-spin" />} {loading ? "Sending…" : "Send code"}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                    <label className={authLabel}>Verification code
                        <input type="text" inputMode="numeric" placeholder="6-digit code" value={otp} onChange={(e) => setOtp(e.target.value)} required maxLength="6" className={`${authInput} text-center tracking-[0.5em] text-xl font-extrabold`} />
                    </label>
                    <button type="submit" disabled={loading} className={authButton}>
                        {loading && <Loader2 size={18} className="animate-spin" />} {loading ? "Checking…" : "Verify code"}
                    </button>
                    <button type="button" onClick={() => { setStep(1); setStatus({ msg: "", isError: false }); }} className="h-12 rounded-full bg-[#F6F6FD] text-[#4B4A6B] text-sm font-bold">
                        Use a different email
                    </button>
                </form>
            )}

            <button onClick={() => navigate('/login')} className="self-center h-11 px-5 rounded-full text-sm font-bold text-indigo-600 hover:bg-[#EEEDFF] flex items-center gap-1.5">
                <ArrowLeft size={16} /> Back to sign in
            </button>
        </AuthShell>
    );
};

export default ForgotPassword;

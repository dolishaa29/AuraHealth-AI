import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Heart, Check, CalendarCheck, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('user');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const handleLogin =async (e) => {
  e.preventDefault();
  setLoading(true);

    if (!email || !password) {
      setMessage("Please fill all fields");
      return;
    }
    if(role==="user"){
    try {
      const response = await axios.post(
        import.meta.env.VITE_API_URL + "/userlogin",
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.status === 200 && response.data.token) {
        Cookies.set("token", response.data.token, { expires: 1 });

        setMessage("Login Successful");
        navigate("/Userdashboard");
      } else {
        setMessage(response.data.msg || "Invalid Credentials");
      }

    } catch (err) {
      console.error("Login Error:", err.response ? err.response.data : err.message);
      setMessage(err.response?.data?.msg || "Login Failed! Please try again.");
    } finally {
      setLoading(false);
    }
    }

    else if(role==="doctor"){

    try {
      const response = await axios.post(
        import.meta.env.VITE_API_URL + "/doctorlogin",
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.status === 200 && response.data.token) {
        Cookies.set("emstoken", response.data.token, { expires: 1 });

        setMessage("Login Successful");
        navigate("/Doctordashboard");
      } else {
        setMessage(response.data.msg || "Invalid Credentials");
      }

    } catch (err) {
      console.error("Login Error:", err.response ? err.response.data : err.message);
      setMessage(err.response?.data?.msg || "Login Failed! Please try again.");
    } finally {
      setLoading(false);
    }

  }

  else if(role==="admin"){
    try {
      const response = await axios.post(
        import.meta.env.VITE_API_URL + "/adminlogin",
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.status === 200 && response.data.token) {

        Cookies.set("emtoken", response.data.token, { expires: 1 });

        setMessage("Login Successful");
        navigate("/Admindashboard");
      } else {
        setMessage(response.data.msg || "Invalid login credentials");
      }

    } catch (err) {
      console.error("Login Error:", err.response ? err.response.data : err.message);
      setMessage(err.response?.data?.msg || "Login failed! Please try again.");
    } finally {
      setLoading(false);
    }
  }

}

  const roles = [{ id: 'user', label: 'Patient' }, { id: 'doctor', label: 'Doctor' }, { id: 'admin', label: 'Admin' }];
  const inputCls = "w-full h-[54px] px-5 rounded-full bg-[#F6F6FD] border-2 border-transparent text-[15px] font-medium text-[#1E1B4B] placeholder:text-[#9A99B5] focus:outline-none focus:border-indigo-300 focus:bg-white transition-all";

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#F6F6FD] font-sans text-[#1E1B4B]">
      <div className="w-full max-w-[1180px] flex flex-wrap gap-5 p-4 sm:p-5 rounded-[40px] bg-white shadow-[0_20px_60px_rgba(79,70,229,0.08)]">

        <section className="relative overflow-hidden flex-[1_1_420px] min-h-[300px] lg:min-h-[560px] rounded-[30px] bg-[#E9E8FF] p-8 sm:p-10 flex flex-col justify-between gap-8">
          <div aria-hidden="true" className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-[#DAD8FF]" />
          <div aria-hidden="true" className="absolute -left-16 -bottom-28 w-64 h-64 rounded-full bg-[#D2CFFF]" />
          <div className="relative flex items-center gap-2.5">
            <div className="w-[42px] h-[42px] rounded-[15px] bg-indigo-600 text-white flex items-center justify-center">
              <Heart size={22} />
            </div>
            <span className="font-extrabold text-[21px] tracking-tight">AuraHealth</span>
          </div>
          <div className="relative">
            <h1 className="text-4xl sm:text-[42px] font-extrabold leading-[1.1] tracking-[-0.035em]">Feeling better starts here.</h1>
            <p className="mt-3.5 text-base leading-relaxed text-[#4B4A6B] max-w-[420px]">Doctors, reports, medicine reminders and SOS, all in one gentle place.</p>
          </div>
          <div className="relative hidden sm:flex flex-col gap-2.5">
            <div className="self-start flex items-center gap-3 py-3 pl-3 pr-5 rounded-full bg-white shadow-[0_10px_30px_rgba(79,70,229,0.1)]">
              <span className="w-[38px] h-[38px] rounded-full bg-[#E7F7EF] text-[#05603A] flex items-center justify-center"><Check size={18} strokeWidth={3} /></span>
              <span className="text-sm font-bold">Vitamin D3 taken · 2:00 PM</span>
            </div>
            <div className="self-start ml-10 flex items-center gap-3 py-3 pl-3 pr-5 rounded-full bg-white shadow-[0_10px_30px_rgba(79,70,229,0.1)]">
              <span className="w-[38px] h-[38px] rounded-full bg-[#FFF0E6] text-[#9A3412] flex items-center justify-center"><CalendarCheck size={18} /></span>
              <span className="text-sm font-bold">Appointment confirmed · Tue 10:30</span>
            </div>
          </div>
        </section>

        <main className="flex-[1_1_400px] flex items-center justify-center px-2 py-8 sm:px-6">
          <form onSubmit={handleLogin} className="w-full max-w-[400px] flex flex-col gap-[18px]">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">Welcome back</h2>
              <p className="mt-1.5 text-[15px] text-[#6B6A8A]">So good to see you again.</p>
            </div>

            <div role="radiogroup" aria-label="Sign in as" className="grid grid-cols-3 gap-1 p-1.5 rounded-full bg-[#F6F6FD]">
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={role === r.id}
                  onClick={() => setRole(r.id)}
                  className={`h-[42px] rounded-full text-sm font-bold transition-all ${role === r.id ? 'bg-indigo-600 text-white shadow-md' : 'text-[#4B4A6B] hover:text-indigo-600'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <label className="flex flex-col gap-2 text-sm font-bold">
              Email
              <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} />
            </label>

            <label className="flex flex-col gap-2 text-sm font-bold">
              <span className="flex justify-between">
                Password
                {role !== 'admin' && (
                  <button type="button" onClick={() => navigate(`/forgotpassword/${role}`)} className="text-[13px] font-bold text-indigo-600 hover:text-indigo-700">
                    Forgot it?
                  </button>
                )}
              </span>
              <span className="relative flex">
                <input type={showPassword ? 'text' : 'password'} placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} required className={`${inputCls} pr-14`} />
                <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-[7px] top-[7px] w-10 h-10 rounded-full bg-white text-[#4B4A6B] flex items-center justify-center hover:text-indigo-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            {message && <p className="px-4 py-3 rounded-2xl bg-[#FFECEB] text-[#B42318] text-sm font-semibold">{message}</p>}

            <button type="submit" disabled={loading} className="h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-base font-extrabold shadow-[0_12px_24px_-8px_rgba(79,70,229,0.55)] transition-all active:scale-[0.98] disabled:opacity-50">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            {role !== 'admin' && (
              <p className="text-center text-sm text-[#6B6A8A]">
                New here?{' '}
                <button type="button" onClick={() => navigate(role === 'doctor' ? '/Doctorregister' : '/Userregister')} className="font-extrabold text-indigo-600 hover:text-indigo-700">
                  Create an account
                </button>
                {role === 'user' && ' and get 30 free AI credits'}
              </p>
            )}
          </form>
        </main>
      </div>
    </div>
  );
};

export default Login;
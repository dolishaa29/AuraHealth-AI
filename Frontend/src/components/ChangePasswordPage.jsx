import React, { useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, ChevronLeft } from 'lucide-react';

const inputCls = "w-full h-[52px] pl-5 pr-14 rounded-full bg-[#F6F6FD] border-2 border-transparent text-[15px] font-medium text-[#1E1B4B] placeholder:text-[#9A99B5] focus:outline-none focus:border-indigo-300 focus:bg-white";

const ChangePasswordPage = ({ endpoint, cookieName }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (form.next.length < 6) { setError('Your new password needs at least 6 characters.'); return; }
    if (form.next !== form.confirm) { setError("The new passwords don't match."); return; }
    setLoading(true);
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}${endpoint}`,
        { oldpassword: form.current, newpassword: form.next },
        { headers: { Authorization: `Bearer ${Cookies.get(cookieName)}` }, withCredentials: true });
      setSuccess('Password updated. Use it next time you sign in.');
      setForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const field = (label, key, autoComplete) => (
    <label className="flex flex-col gap-2 text-sm font-bold">
      {label}
      <span className="relative flex">
        <input type={show ? 'text' : 'password'} required autoComplete={autoComplete} value={form[key]} onChange={update(key)} className={inputCls} />
      </span>
    </label>
  );

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-2 lg:py-2">
      <div className="max-w-xl flex flex-col gap-5 pb-16">
        <button onClick={() => navigate(-1)} className="self-start h-10 pl-2 pr-4 rounded-full bg-white text-[#4B4A6B] text-sm font-bold flex items-center gap-1 hover:text-indigo-600 shadow-[0_8px_30px_rgba(79,70,229,0.06)]">
          <ChevronLeft size={16} /> Back
        </button>

        <section className="relative overflow-hidden rounded-[32px] bg-[#E9E8FF] p-7 flex items-center gap-5">
          <div aria-hidden="true" className="absolute -right-12 -top-16 w-48 h-48 rounded-full bg-[#DAD8FF]" />
          <span className="relative w-16 h-16 shrink-0 rounded-full bg-white text-indigo-600 flex items-center justify-center"><Lock size={26} /></span>
          <div className="relative">
            <h1 className="text-[26px] font-extrabold tracking-tight">Change password</h1>
            <p className="text-[15px] text-[#4B4A6B]">Pick something you haven't used before.</p>
          </div>
        </section>

        <form onSubmit={submit} className="bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgba(79,70,229,0.06)] flex flex-col gap-4">
          {field('Current password', 'current', 'current-password')}
          {field('New password', 'next', 'new-password')}
          {field('Confirm new password', 'confirm', 'new-password')}

          <button type="button" onClick={() => setShow((s) => !s)} className="self-start flex items-center gap-2 text-sm font-bold text-indigo-600">
            {show ? <EyeOff size={16} /> : <Eye size={16} />} {show ? 'Hide passwords' : 'Show passwords'}
          </button>

          {error && <p className="px-4 py-3 rounded-[18px] bg-[#FFECEB] text-[#B42318] text-sm font-semibold">{error}</p>}
          {success && <p className="px-4 py-3 rounded-[18px] bg-[#E7F7EF] text-[#05603A] text-sm font-bold flex items-center gap-2"><CheckCircle2 size={16} /> {success}</p>}

          <button type="submit" disabled={loading} className="h-[52px] rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-base font-extrabold flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_10px_20px_-6px_rgba(79,70,229,0.5)]">
            {loading && <Loader2 size={16} className="animate-spin" />} Update password
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordPage;

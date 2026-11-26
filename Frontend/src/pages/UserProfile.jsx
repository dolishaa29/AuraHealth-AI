import React, { useCallback, useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import { Camera, CheckCircle2, Lock, ShieldAlert, Loader2, Droplet, ChevronRight } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const CARD = "bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgba(79,70,229,0.06)]";
const inputCls = "w-full h-12 px-4 rounded-[18px] bg-[#F6F6FD] border-2 border-transparent text-sm font-medium text-[#1E1B4B] placeholder:text-[#9A99B5] focus:outline-none focus:border-indigo-300 focus:bg-white disabled:opacity-60";

const Field = ({ label, children }) => (
  <label className="flex flex-col gap-1.5 text-[13px] font-bold text-[#4B4A6B]">{label}{children}</label>
);

const UserProfile = () => {
  const [user, setUser] = useState({
    name: "", email: "", contact: "", address: "", gender: "", dob: "",
    fatherName: "", motherName: "", maritalStatus: "", nationality: "",
    bloodGroup: "", emergencyContactName: "", emergencyContactNumber: "",
    emergencyRelation: "", image: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/userprofile`, {
        headers: { Authorization: `Bearer ${Cookies.get("token")}` },
        withCredentials: true,
      });
      const userData = response.data.user;
      setUser(userData);
      if (userData.image) setImagePreview(userData.image);
    } catch {
      setError("Failed to fetch profile details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUserProfile(); }, [fetchUserProfile]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      const file = files[0];
      if (file) {
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
      }
    } else {
      setUser((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);
    const formData = new FormData();
    [
      "name", "email", "contact", "address", "gender", "dob",
      "fatherName", "motherName", "maritalStatus", "nationality",
      "bloodGroup", "emergencyContactName", "emergencyContactNumber", "emergencyRelation",
    ].forEach((k) => formData.append(k, user[k] || ""));
    if (imageFile) formData.append("image", imageFile);
    try {
      await axios.put(`${API_BASE_URL}/updateuser`, formData, {
        headers: { Authorization: `Bearer ${Cookies.get("token")}`, "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      setSuccess(true);
      setImageFile(null);
      fetchUserProfile();
      setTimeout(() => setSuccess(false), 4000);
    } catch {
      setError("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center gap-2 text-[#6B6A8A] text-sm"><Loader2 size={16} className="animate-spin" /> Loading…</div>;
  }

  const dobValue = user.dob ? String(user.dob).slice(0, 10) : "";
  const initials = (user.name || "?").split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-2 lg:py-2">
      <form onSubmit={handleSubmit} className="flex flex-col gap-[22px] pb-24">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-[1_1_300px]">
            <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-[-0.025em]">Your profile</h1>
            <p className="mt-1.5 text-[15px] text-[#6B6A8A]">Keep this up to date so doctors have the right details.</p>
          </div>
          <button type="submit" disabled={saving} className="h-12 px-6 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-[15px] font-bold flex items-center gap-2 disabled:opacity-50 shadow-[0_10px_20px_-6px_rgba(79,70,229,0.5)]">
            {saving && <Loader2 size={16} className="animate-spin" />} Save changes
          </button>
        </div>

        {success && <p className="px-5 py-3 rounded-[20px] bg-[#E7F7EF] text-[#05603A] text-sm font-bold flex items-center gap-2"><CheckCircle2 size={16} /> Profile saved</p>}
        {error && <p className="px-5 py-3 rounded-[20px] bg-[#FFECEB] text-[#B42318] text-sm font-semibold">{error}</p>}

        <section className="relative overflow-hidden rounded-[32px] bg-[#E9E8FF] p-7 flex flex-wrap items-center gap-6">
          <div aria-hidden="true" className="absolute -right-14 -top-20 w-64 h-64 rounded-full bg-[#DAD8FF]" />
          <label className="relative cursor-pointer group">
            {imagePreview ? (
              <img src={imagePreview} alt="Your photo" className="w-28 h-28 rounded-full object-cover ring-4 ring-white" />
            ) : (
              <span className="w-28 h-28 rounded-full bg-white text-indigo-600 flex items-center justify-center text-4xl font-extrabold">{initials}</span>
            )}
            <span className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center ring-4 ring-[#E9E8FF] group-hover:bg-indigo-700"><Camera size={16} /></span>
            <input type="file" name="image" accept="image/*" onChange={handleChange} className="sr-only" aria-label="Change photo" />
          </label>
          <div className="relative flex-[1_1_260px] min-w-0">
            <h2 className="text-2xl font-extrabold tracking-tight truncate">{user.name || "Your name"}</h2>
            <p className="text-[15px] text-[#4B4A6B] truncate">{user.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {user.bloodGroup && <span className="px-3.5 py-1.5 rounded-full bg-white text-[#B42318] text-sm font-bold flex items-center gap-1"><Droplet size={14} /> {user.bloodGroup}</span>}
              {user.gender && <span className="px-3.5 py-1.5 rounded-full bg-white text-sm font-bold capitalize">{user.gender}</span>}
              {user.contact && <span className="px-3.5 py-1.5 rounded-full bg-white text-sm font-bold">{user.contact}</span>}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-5 items-start">
          <div className="flex-[999_1_480px] min-w-0 flex flex-col gap-5">
            <section className={CARD}>
              <h2 className="mb-4 text-lg font-extrabold">About you</h2>
              <div className="grid sm:grid-cols-2 gap-3.5">
                <Field label="Full name"><input name="name" value={user.name || ""} onChange={handleChange} className={inputCls} /></Field>
                <Field label="Email"><input name="email" value={user.email || ""} disabled className={inputCls} /></Field>
                <Field label="Phone"><input name="contact" value={user.contact || ""} onChange={handleChange} className={inputCls} /></Field>
                <Field label="Date of birth"><input type="date" name="dob" value={dobValue} onChange={handleChange} className={inputCls} /></Field>
                <Field label="Gender">
                  <select name="gender" value={user.gender || ""} onChange={handleChange} className={inputCls}>
                    <option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Blood group">
                  <select name="bloodGroup" value={user.bloodGroup || ""} onChange={handleChange} className={inputCls}>
                    <option value="">Select</option>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </Field>
                <div className="sm:col-span-2"><Field label="Address"><input name="address" value={user.address || ""} onChange={handleChange} className={inputCls} /></Field></div>
              </div>
            </section>

            <section className={CARD}>
              <h2 className="mb-4 text-lg font-extrabold">Family &amp; background</h2>
              <div className="grid sm:grid-cols-2 gap-3.5">
                <Field label="Father's name"><input name="fatherName" value={user.fatherName || ""} onChange={handleChange} className={inputCls} /></Field>
                <Field label="Mother's name"><input name="motherName" value={user.motherName || ""} onChange={handleChange} className={inputCls} /></Field>
                <Field label="Marital status">
                  <select name="maritalStatus" value={user.maritalStatus || ""} onChange={handleChange} className={inputCls}>
                    <option value="">Select</option><option value="single">Single</option><option value="married">Married</option><option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Nationality"><input name="nationality" value={user.nationality || ""} onChange={handleChange} className={inputCls} /></Field>
              </div>
            </section>
          </div>

          <div className="flex-[1_1_300px] min-w-0 flex flex-col gap-5">
            <button type="button" onClick={() => navigate("/emergency-contacts")} className="text-left rounded-[28px] bg-[#FFECEB] p-6 flex gap-3.5 items-start hover:-translate-y-0.5 transition-transform">
              <span className="w-12 h-12 shrink-0 rounded-full bg-white text-[#D92D20] flex items-center justify-center"><ShieldAlert size={20} /></span>
              <span className="flex-1">
                <span className="block text-base font-extrabold text-[#7A271A]">Emergency contacts</span>
                <span className="block mt-1 text-sm text-[#7A271A]">Choose who gets your location when you hold SOS.</span>
              </span>
              <ChevronRight size={18} className="text-[#B42318] mt-1" />
            </button>
            <button type="button" onClick={() => navigate("/changepassworduser")} className="text-left rounded-[28px] bg-[#EEEDFF] p-6 flex gap-3.5 items-start hover:-translate-y-0.5 transition-transform">
              <span className="w-12 h-12 shrink-0 rounded-full bg-white text-indigo-600 flex items-center justify-center"><Lock size={20} /></span>
              <span className="flex-1">
                <span className="block text-base font-extrabold text-[#312E81]">Change password</span>
                <span className="block mt-1 text-sm text-[#4B4A6B]">Keep your account safe.</span>
              </span>
              <ChevronRight size={18} className="text-indigo-600 mt-1" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default UserProfile;

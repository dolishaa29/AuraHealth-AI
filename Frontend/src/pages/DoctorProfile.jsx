import React, { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import { Camera, Lock, CheckCircle2, Loader2, ChevronRight, Building2, GraduationCap, Briefcase } from "lucide-react";

const CARD = "bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgba(79,70,229,0.06)]";
const inputCls = "w-full h-12 px-4 rounded-[18px] bg-[#F6F6FD] border-2 border-transparent text-sm font-medium text-[#1E1B4B] placeholder:text-[#9A99B5] focus:outline-none focus:border-indigo-300 focus:bg-white disabled:opacity-60";

const Field = ({ label, children, wide }) => (
  <label className={`flex flex-col gap-1.5 text-[13px] font-bold text-[#4B4A6B] ${wide ? "sm:col-span-2" : ""}`}>{label}{children}</label>
);

const DoctorProfile = () => {
  const [doctor, setDoctor] = useState({
    name: "", email: "", contact: "", gender: "",
    experienceYears: "", hospitalName: "", HospitalAddress: "",
    bio: "", specialization: "", title: "", institution: "",
    year: "", image: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  const fetchDoctorProfile = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/doctorprofile`, {
        headers: { Authorization: `Bearer ${Cookies.get("emstoken")}` },
        withCredentials: true,
      });
      if (data?.doctors) {
        setDoctor(data.doctors);
        if (data.doctors.image) setImagePreview(data.doctors.image);
      }
    } catch {
      setError("Failed to fetch profile details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDoctorProfile(); }, []);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      const file = files[0];
      if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
    } else {
      setDoctor((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);
    const formData = new FormData();
    ["name", "email", "contact", "gender", "specialization", "experienceYears",
      "hospitalName", "HospitalAddress", "bio", "title", "institution", "year",
    ].forEach((k) => formData.append(k, doctor[k] || ""));
    if (imageFile) formData.append("image", imageFile);
    try {
      await axios.put(`${API_BASE_URL}/updatedoctor`, formData, {
        headers: { Authorization: `Bearer ${Cookies.get("emstoken")}`, "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      setSuccess(true);
      setImageFile(null);
      fetchDoctorProfile();
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

  const initials = (doctor.name || "D").split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-2 lg:py-2">
      <form onSubmit={handleSubmit} className="flex flex-col gap-[22px] pb-16">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-[1_1_300px]">
            <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-[-0.025em]">Your profile</h1>
            <p className="mt-1.5 text-[15px] text-[#6B6A8A]">This is what patients see when they look for a doctor.</p>
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
          <div className="relative flex-[1_1_280px] min-w-0">
            <h2 className="text-2xl font-extrabold tracking-tight truncate">Dr. {doctor.name || "Your name"}</h2>
            <p className="text-[15px] text-[#4B4A6B] truncate">{doctor.specialization || "Add your specialty"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {doctor.experienceYears && <span className="px-3.5 py-1.5 rounded-full bg-white text-sm font-bold flex items-center gap-1.5"><Briefcase size={14} /> {doctor.experienceYears} yrs</span>}
              {doctor.hospitalName && <span className="px-3.5 py-1.5 rounded-full bg-white text-sm font-bold flex items-center gap-1.5"><Building2 size={14} /> {doctor.hospitalName}</span>}
              {doctor.title && <span className="px-3.5 py-1.5 rounded-full bg-white text-sm font-bold flex items-center gap-1.5"><GraduationCap size={14} /> {doctor.title}</span>}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-5 items-start">
          <div className="flex-[999_1_480px] min-w-0 flex flex-col gap-5">
            <section className={CARD}>
              <h2 className="mb-4 text-lg font-extrabold">About you</h2>
              <div className="grid sm:grid-cols-2 gap-3.5">
                <Field label="Full name"><input name="name" value={doctor.name || ""} onChange={handleChange} className={inputCls} /></Field>
                <Field label="Email"><input name="email" value={doctor.email || ""} disabled className={inputCls} /></Field>
                <Field label="Phone"><input name="contact" value={doctor.contact || ""} onChange={handleChange} className={inputCls} /></Field>
                <Field label="Gender">
                  <select name="gender" value={doctor.gender || ""} onChange={handleChange} className={inputCls}>
                    <option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Bio" wide>
                  <textarea name="bio" rows={4} value={doctor.bio || ""} onChange={handleChange} placeholder="A few friendly lines about how you work with patients"
                    className="w-full px-4 py-3 rounded-[18px] bg-[#F6F6FD] border-2 border-transparent text-sm font-medium focus:outline-none focus:border-indigo-300 focus:bg-white resize-none" />
                </Field>
              </div>
            </section>

            <section className={CARD}>
              <h2 className="mb-4 text-lg font-extrabold">Practice</h2>
              <div className="grid sm:grid-cols-2 gap-3.5">
                <Field label="Specialty"><input name="specialization" value={doctor.specialization || ""} onChange={handleChange} className={inputCls} /></Field>
                <Field label="Years of experience"><input type="number" min="0" name="experienceYears" value={doctor.experienceYears || ""} onChange={handleChange} className={inputCls} /></Field>
                <Field label="Hospital / clinic"><input name="hospitalName" value={doctor.hospitalName || ""} onChange={handleChange} className={inputCls} /></Field>
                <Field label="Hospital address"><input name="HospitalAddress" value={doctor.HospitalAddress || ""} onChange={handleChange} className={inputCls} /></Field>
              </div>
            </section>

            <section className={CARD}>
              <h2 className="mb-4 text-lg font-extrabold">Education</h2>
              <div className="grid sm:grid-cols-3 gap-3.5">
                <Field label="Degree"><input name="title" value={doctor.title || ""} onChange={handleChange} placeholder="MBBS, MD" className={inputCls} /></Field>
                <Field label="Institution"><input name="institution" value={doctor.institution || ""} onChange={handleChange} className={inputCls} /></Field>
                <Field label="Year"><input name="year" value={doctor.year || ""} onChange={handleChange} className={inputCls} /></Field>
              </div>
            </section>
          </div>

          <div className="flex-[1_1_300px] min-w-0 flex flex-col gap-5">
            <section className="rounded-[28px] bg-[#E7F7EF] p-6">
              <h2 className="text-base font-extrabold text-[#054F31]">Tip</h2>
              <p className="mt-1 text-sm text-[#05603A]">A clear photo, your specialty and a short bio help patients choose you with confidence.</p>
            </section>
            <button type="button" onClick={() => navigate("/changepassword")} className="text-left rounded-[28px] bg-[#EEEDFF] p-6 flex gap-3.5 items-start hover:-translate-y-0.5 transition-transform">
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

export default DoctorProfile;

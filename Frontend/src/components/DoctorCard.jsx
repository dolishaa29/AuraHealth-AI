import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Loader2, MapPin } from 'lucide-react';

const AVATARS = ["bg-[#FFF0E6] text-[#9A3412]", "bg-[#FFECEB] text-[#B42318]", "bg-[#E7F7EF] text-[#05603A]", "bg-[#E6F1FF] text-[#1E40AF]", "bg-[#EEEDFF] text-[#3730A3]"];
const initials = (name = "") => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "DR";

const DoctorCard = ({ doctor, image, index = 0 }) => {
  const navigate = useNavigate();
  const [isBooking, setIsBooking] = useState(false);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const sendRequest = async () => {
    if (!description.trim()) {
      setMessage({ ok: false, text: "Tell the doctor what's bothering you." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/appointrequest`,
        { doctorid: doctor._id, description },
        { headers: { Authorization: `Bearer ${Cookies.get("token")}` }, withCredentials: true }
      );
      setMessage({ ok: true, text: "Request sent! 20 credits were used." });
      window.dispatchEvent(new Event("credits-changed"));
      setIsBooking(false);
      setDescription("");
    } catch (err) {
      setMessage({ ok: false, text: err.response?.data?.msg || "Couldn't send the request." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="h-full bg-white rounded-[28px] p-[22px] shadow-[0_8px_30px_rgba(79,70,229,0.06)] flex flex-col gap-3.5">
      <button onClick={() => navigate(`/doctorprofileview/${doctor._id}`)} className="flex items-center gap-3.5 text-left">
        {image ? (
          <img src={image} alt="" className="w-16 h-16 shrink-0 rounded-full object-cover" />
        ) : (
          <span className={`w-16 h-16 shrink-0 rounded-full flex items-center justify-center text-xl font-extrabold ${AVATARS[index % AVATARS.length]}`}>{initials(doctor.name)}</span>
        )}
        <span className="min-w-0">
          <span className="block text-[17px] font-extrabold truncate">Dr. {doctor.name}</span>
          <span className="block text-[13px] text-[#6B6A8A] truncate">
            {doctor.specialization || "General physician"}{doctor.experienceYears ? ` · ${doctor.experienceYears} yrs` : ""}
          </span>
        </span>
      </button>

      <div className="flex flex-wrap gap-1.5">
        {doctor.hospitalName && <span className="px-3 py-1 rounded-full bg-[#F6F6FD] text-[#4B4A6B] text-xs font-bold">{doctor.hospitalName}</span>}
        {doctor.clinicAddress && (
          <span className="px-3 py-1 rounded-full bg-[#F6F6FD] text-[#4B4A6B] text-xs font-bold flex items-center gap-1 max-w-full truncate"><MapPin size={12} />{doctor.clinicAddress}</span>
        )}
      </div>

      {message && (
        <p className={`px-3.5 py-2 rounded-[16px] text-[13px] font-semibold ${message.ok ? "bg-[#E7F7EF] text-[#05603A]" : "bg-[#FFECEB] text-[#B42318]"}`}>{message.text}</p>
      )}

      {isBooking ? (
        <div className="mt-auto flex flex-col gap-2.5">
          <label className="sr-only" htmlFor={`reason-${doctor._id}`}>Reason for visit</label>
          <textarea id={`reason-${doctor._id}`} rows={3} autoFocus value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="What's bothering you?"
            className="w-full px-4 py-3 rounded-[18px] bg-[#F6F6FD] border-2 border-transparent text-sm font-medium focus:outline-none focus:border-indigo-300 focus:bg-white resize-none" />
          <div className="flex gap-2">
            <button onClick={() => setIsBooking(false)} className="h-11 px-4 rounded-full bg-[#F6F6FD] text-[#4B4A6B] text-sm font-bold">Cancel</button>
            <button onClick={sendRequest} disabled={loading} className="flex-1 h-11 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              {loading && <Loader2 size={14} className="animate-spin" />} Send · 20 credits
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-auto flex gap-2">
          <button onClick={() => navigate('/SlotBooking', { state: { doctorId: doctor._id } })} className="flex-1 h-11 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold">Book a slot</button>
          <button onClick={() => { setIsBooking(true); setMessage(null); }} className="h-11 px-4 rounded-full bg-[#EEEDFF] text-[#3730A3] text-sm font-bold">Request</button>
        </div>
      )}
    </article>
  );
};

export default DoctorCard;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';

const AVATARS = ["bg-[#FFF0E6] text-[#9A3412]", "bg-[#FFECEB] text-[#B42318]", "bg-[#E7F7EF] text-[#05603A]", "bg-[#E6F1FF] text-[#1E40AF]", "bg-[#EEEDFF] text-[#3730A3]"];
const initials = (name = "") => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "DR";

const DoctorCard = ({ doctor, image, index = 0 }) => {
  const navigate = useNavigate();
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

      <button onClick={() => navigate('/SlotBooking', { state: { doctorId: doctor._id } })} className="mt-auto h-11 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold">Book a slot</button>
    </article>
  );
};

export default DoctorCard;

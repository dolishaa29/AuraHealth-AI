import React from "react";
import { Search, Sparkles, AlertTriangle, Loader2, ChevronRight } from "lucide-react";

const URGENCY_STYLES = {
  high: "bg-[#FFECEB] text-[#B42318]",
  medium: "bg-[#FFF4E5] text-[#B45309]",
  low: "bg-[#E7F7EF] text-[#05603A]",
};
const AVATARS = ["bg-[#FFF0E6] text-[#9A3412]", "bg-[#FFECEB] text-[#B42318]", "bg-[#E7F7EF] text-[#05603A]", "bg-[#E6F1FF] text-[#1E40AF]", "bg-[#EEEDFF] text-[#3730A3]"];
const initials = (name = "") => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "DR";

const DoctorSearchStep = ({
  search, onSearchChange, loadingDoctors, filtered, getImageUrl, onSelectDoctor,
  symptoms, onSymptomsChange, onTriage, triageLoading, triageResult,
}) => (
  <div className="flex flex-col gap-5">

    <section className="relative overflow-hidden rounded-[32px] bg-[#E9E8FF] p-6 sm:p-7">
      <div aria-hidden="true" className="absolute -right-14 -top-16 w-56 h-56 rounded-full bg-[#DAD8FF]" />
      <div className="relative">
        <p className="flex items-center gap-2 text-sm font-extrabold text-indigo-600"><Sparkles size={16} /> Not sure who to see?</p>
        <h2 className="mt-1 mb-4 text-xl sm:text-2xl font-extrabold tracking-tight">Tell us how you feel and we'll suggest a specialist</h2>
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="symptoms">Your symptoms</label>
          <input id="symptoms" value={symptoms} onChange={(e) => onSymptomsChange(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onTriage()}
            placeholder="e.g. itchy rash on my arm for 2 weeks"
            className="flex-[1_1_260px] h-[52px] px-5 rounded-full bg-white text-[15px] font-medium placeholder:text-[#9A99B5] focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <button onClick={onTriage} disabled={triageLoading || !symptoms.trim()} className="h-[52px] px-6 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-[15px] font-bold flex items-center gap-2 disabled:opacity-50">
            {triageLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Suggest
          </button>
        </div>
        {triageResult && (
          <div className="mt-4 p-4 rounded-[20px] bg-white flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {triageResult.specialization && <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-sm font-bold">{triageResult.specialization}</span>}
              {triageResult.urgency && (
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 ${URGENCY_STYLES[triageResult.urgency] || URGENCY_STYLES.low}`}>
                  {triageResult.urgency === "high" && <AlertTriangle size={12} />} {triageResult.urgency} urgency
                </span>
              )}
            </div>
            {triageResult.reasoning && <p className="text-sm text-[#4B4A6B]">{triageResult.reasoning}</p>}
          </div>
        )}
      </div>
    </section>

    <label className="flex items-center gap-3 h-14 px-[22px] rounded-full bg-white text-[#6B6A8A] shadow-[0_8px_30px_rgba(79,70,229,0.06)] focus-within:ring-2 focus-within:ring-indigo-200">
      <Search size={20} />
      <span className="sr-only">Search doctors</span>
      <input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search by name or specialty"
        className="flex-1 bg-transparent text-[15px] text-[#1E1B4B] placeholder:text-[#9A99B5] focus:outline-none" />
    </label>

    {loadingDoctors ? (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {[1, 2, 3].map((n) => <div key={n} className="h-24 rounded-[24px] bg-white animate-pulse" />)}
      </div>
    ) : filtered.length === 0 ? (
      <p className="py-10 text-center text-[#6B6A8A] font-semibold">No doctors match your search.</p>
    ) : (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {filtered.map((doc, i) => {
          const img = getImageUrl(doc.image);
          return (
            <button key={doc._id} onClick={() => onSelectDoctor(doc)}
              className="group flex items-center gap-3.5 p-4 rounded-[24px] bg-white text-left shadow-[0_8px_30px_rgba(79,70,229,0.06)] hover:shadow-[0_0_0_2px_#4F46E5] transition-shadow">
              {img ? <img src={img} alt="" className="w-14 h-14 shrink-0 rounded-full object-cover" />
                : <span className={`w-14 h-14 shrink-0 rounded-full flex items-center justify-center text-lg font-extrabold ${AVATARS[i % AVATARS.length]}`}>{initials(doc.name)}</span>}
              <span className="flex-1 min-w-0">
                <span className="block text-base font-extrabold truncate">Dr. {doc.name}</span>
                <span className="block text-[13px] text-[#6B6A8A] truncate">{doc.specialization || "General physician"}{doc.hospitalName ? ` · ${doc.hospitalName}` : ""}</span>
              </span>
              <ChevronRight size={18} className="text-[#C9C8E0] group-hover:text-indigo-600" />
            </button>
          );
        })}
      </div>
    )}
  </div>
);

export default DoctorSearchStep;

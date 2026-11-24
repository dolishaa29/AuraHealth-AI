import React from "react";
import { ChevronLeft, AlertCircle, Loader2 } from "lucide-react";
import { formatTime } from "./utils";
import { Link } from "react-router-dom";

const BookingConfirmStep = ({
  selectedDoctor, selectedDate, selectedSlot, description, onDescriptionChange, error, submitting, onBack, onSubmit, bookingCost,
}) => (
  <div className="max-w-2xl flex flex-col gap-5">
    <button onClick={onBack} className="self-start h-10 pl-2 pr-4 rounded-full bg-white text-[#4B4A6B] text-sm font-bold flex items-center gap-1 hover:text-indigo-600 shadow-[0_8px_30px_rgba(79,70,229,0.06)]">
      <ChevronLeft size={16} /> Change time
    </button>

    <section className="relative overflow-hidden rounded-[32px] bg-[#E9E8FF] p-7">
      <div aria-hidden="true" className="absolute -right-14 -top-16 w-52 h-52 rounded-full bg-[#DAD8FF]" />
      <p className="relative text-sm font-bold text-indigo-600">You're booking</p>
      <h2 className="relative mt-1 text-2xl font-extrabold tracking-tight">Dr. {selectedDoctor?.name}</h2>
      <p className="relative text-[15px] text-[#4B4A6B]">{selectedDoctor?.specialization}</p>
      <div className="relative mt-4 flex flex-wrap gap-2">
        <span className="px-4 py-2 rounded-full bg-white text-sm font-bold">{new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</span>
        <span className="px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-bold">{formatTime(selectedSlot)}</span>
      </div>
    </section>

    <section className="bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgba(79,70,229,0.06)] flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-base font-extrabold">
        What's bothering you?
        <textarea value={description} onChange={(e) => onDescriptionChange(e.target.value)} rows={4}
          placeholder="Describe your symptoms so the doctor can prepare"
          className="px-4 py-3.5 rounded-[20px] bg-[#F6F6FD] border-2 border-transparent text-sm font-medium focus:outline-none focus:border-indigo-300 focus:bg-white resize-none" />
      </label>

      {error && <p className="px-4 py-3 rounded-[18px] bg-[#FFECEB] text-[#B42318] text-sm font-semibold flex items-center gap-2"><AlertCircle size={16} /> {error}</p>}

      <div className="flex justify-between items-center px-4 py-3.5 rounded-[20px] bg-[#F6F6FD] text-sm">
        <span className="text-[#4B4A6B]">Booking fee</span>
        <strong>{bookingCost} consultation credits</strong>
      </div>

      <button onClick={onSubmit} disabled={submitting || !description.trim()}
        className="h-[54px] rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-base font-extrabold flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_10px_20px_-6px_rgba(79,70,229,0.5)]">
        {submitting && <Loader2 size={18} className="animate-spin" />} {submitting ? "Booking…" : "Confirm booking"}
      </button>
      <p className="text-center text-xs text-[#6B6A8A]">Consultation credits are used when the booking is confirmed. <Link to="/credits" className="font-bold text-indigo-700 underline">View credit packs</Link></p>
    </section>
  </div>
);

export default BookingConfirmStep;

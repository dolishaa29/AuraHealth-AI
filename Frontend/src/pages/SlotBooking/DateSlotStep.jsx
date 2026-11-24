import React from "react";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import { formatTime } from "./utils";

const nextDays = () => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({ value, weekday: d.toLocaleDateString("en-IN", { weekday: "short" }), day: d.getDate() });
  }
  return days;
};

const DateSlotStep = ({
  selectedDoctor, getImageUrl, today, selectedDate, onDateChange, loadingSlots, hasAppointmentToday,
  slots, selectedSlot, onSelectSlot, onBack, onContinue, bookingCost,
}) => {
  const img = getImageUrl(selectedDoctor?.image);
  const pickDate = (value) => onDateChange({ target: { value } });

  return (
    <div className="flex flex-wrap gap-5 items-start">
      <section className="flex-[999_1_480px] min-w-0 bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgba(79,70,229,0.06)] flex flex-col gap-5">
        <button onClick={onBack} className="self-start h-10 pl-2 pr-4 rounded-full bg-[#F6F6FD] text-[#4B4A6B] text-sm font-bold flex items-center gap-1 hover:text-indigo-600">
          <ChevronLeft size={16} /> Change doctor
        </button>

        <div>
          <h2 className="mb-3 text-lg font-extrabold">Pick a day</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
            {nextDays().map((d) => (
              <button key={d.value} onClick={() => pickDate(d.value)} aria-pressed={selectedDate === d.value}
                className={`h-[72px] rounded-[22px] flex flex-col items-center justify-center transition-colors ${selectedDate === d.value ? "bg-indigo-600 text-white" : "bg-[#F6F6FD] hover:bg-[#EEEDFF]"}`}>
                <span className={`text-xs font-semibold ${selectedDate === d.value ? "text-indigo-100" : "text-[#6B6A8A]"}`}>{d.weekday}</span>
                <span className="text-xl font-extrabold">{d.day}</span>
              </button>
            ))}
          </div>
          <label className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#6B6A8A]">
            Another date
            <input type="date" min={today} value={selectedDate} onChange={onDateChange} className="h-10 px-3 rounded-full bg-[#F6F6FD] text-sm font-bold text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </label>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-extrabold">Pick a time</h2>
          {!selectedDate ? (
            <p className="py-6 text-center text-sm text-[#6B6A8A]">Choose a day to see free times.</p>
          ) : loadingSlots ? (
            <p className="py-6 flex items-center justify-center gap-2 text-sm text-[#6B6A8A]"><Loader2 size={16} className="animate-spin" /> Finding free times…</p>
          ) : hasAppointmentToday ? (
            <p className="px-4 py-3 rounded-[18px] bg-[#FFF4E5] text-[#B45309] text-sm font-semibold flex items-center gap-2"><AlertCircle size={16} /> You already have a visit on this day. Only one per day is allowed.</p>
          ) : slots.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#6B6A8A]">No free times on this day.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((s) => (
                <button key={s.time} disabled={!s.available} onClick={() => onSelectSlot(s.time)} aria-pressed={selectedSlot === s.time}
                  className={`h-11 px-[18px] rounded-full text-sm font-bold transition-colors ${!s.available ? "bg-[#EFEFF8] text-[#9A99B5] line-through cursor-not-allowed" : selectedSlot === s.time ? "bg-indigo-600 text-white" : "bg-[#F6F6FD] text-[#1E1B4B] hover:bg-[#EEEDFF]"}`}>
                  {formatTime(s.time)}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="flex-[1_1_300px] min-w-0 relative overflow-hidden rounded-[32px] bg-[#E9E8FF] p-6 flex flex-col gap-4">
        <div aria-hidden="true" className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-[#DAD8FF]" />
        <div className="relative flex items-center gap-3.5">
          {img ? <img src={img} alt="" className="w-14 h-14 rounded-full object-cover" />
            : <span className="w-14 h-14 rounded-full bg-white text-indigo-600 flex items-center justify-center text-lg font-extrabold">{selectedDoctor?.name?.[0] || "D"}</span>}
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-indigo-600">Booking with</p>
            <p className="text-lg font-extrabold truncate">Dr. {selectedDoctor?.name}</p>
            <p className="text-[13px] text-[#4B4A6B] truncate">{selectedDoctor?.specialization}</p>
          </div>
        </div>
        <div className="relative px-4 py-3.5 rounded-[20px] bg-white text-sm flex justify-between">
          <span className="text-[#4B4A6B]">{selectedDate ? new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "No day yet"}{selectedSlot ? ` · ${formatTime(selectedSlot)}` : ""}</span>
          <strong>{bookingCost ? `${bookingCost} consultation credits` : "Choose a date"}</strong>
        </div>
        <button onClick={onContinue} disabled={!selectedSlot}
          className="relative h-[52px] rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-base font-extrabold disabled:opacity-50 shadow-[0_10px_20px_-6px_rgba(79,70,229,0.5)]">
          Continue
        </button>
      </section>
    </div>
  );
};

export default DateSlotStep;

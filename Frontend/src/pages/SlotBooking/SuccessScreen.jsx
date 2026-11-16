import React from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { formatTime } from "./utils";

const SuccessScreen = ({ selectedDoctor, selectedDate, selectedSlot, onReset }) => {
  const navigate = useNavigate();
  return (
    <div className="h-full overflow-y-auto flex items-center justify-center p-6">
      <section className="relative overflow-hidden w-full max-w-md rounded-[36px] bg-[#E7F7EF] p-8 text-center">
        <div aria-hidden="true" className="absolute -right-16 -top-16 w-52 h-52 rounded-full bg-[#D1F2E1]" />
        <span className="relative mx-auto w-20 h-20 rounded-full bg-[#12B76A] text-white flex items-center justify-center shadow-[0_16px_30px_rgba(18,183,106,0.35)]">
          <Check size={38} strokeWidth={3} />
        </span>
        <h1 className="relative mt-5 text-[28px] font-extrabold tracking-tight text-[#054F31]">You're booked!</h1>
        <p className="relative mt-2 text-[15px] text-[#05603A]">
          Dr. {selectedDoctor?.name} on {new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })} at {formatTime(selectedSlot)}.
        </p>
        <div className="relative mt-6 flex flex-col gap-2.5">
          <button onClick={() => navigate("/userviewapp")} className="h-[52px] rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-base font-extrabold">See my appointments</button>
          <button onClick={onReset} className="h-[52px] rounded-full bg-white text-[#054F31] text-base font-bold">Book another</button>
        </div>
      </section>
    </div>
  );
};

export default SuccessScreen;

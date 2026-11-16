import React, { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import SuccessScreen from "./SuccessScreen";
import DoctorSearchStep from "./DoctorSearchStep";
import DateSlotStep from "./DateSlotStep";
import BookingConfirmStep from "./BookingConfirmStep";

const API = import.meta.env.VITE_API_URL;

const SlotBooking = () => {
  const [step, setStep] = useState(1);
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [hasAppointmentToday, setHasAppointmentToday] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageResult, setTriageResult] = useState(null);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    axios
      .get(API + "/viewdoctors")
      .then((r) => setDoctors(r.data.doctors || []))
      .catch(() => setError("Failed to load doctors."))
      .finally(() => setLoadingDoctors(false));
  }, []);

  const filtered = doctors.filter(
    (d) =>
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.specialization?.toLowerCase().includes(search.toLowerCase())
  );

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    const filename = imagePath.split(/[\\/]/).pop();
    return `${API}/images/${filename}`;
  };

  const fetchSlots = async (doctorid, date) => {
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    setHasAppointmentToday(false);
    setError("");
    try {
      const res = await axios.get(API + "/available-slots", {
        params: { doctorid, date },
        headers: { Authorization: `Bearer ${Cookies.get("token")}` },
        withCredentials: true,
      });
      if (res.data.success) {
        setSlots(res.data.slots || []);
        setHasAppointmentToday(res.data.hasAppointmentToday || false);
      }
    } catch {
      setError("Failed to fetch available slots.");
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleTriage = async () => {
    if (!symptoms.trim() || triageLoading) return;
    setTriageLoading(true);
    setTriageResult(null);
    try {
      const res = await axios.post(API + "/triage", { symptoms: symptoms.trim() });
      if (res.data.success) {
        setTriageResult(res.data);
        if (res.data.specialization) setSearch(res.data.specialization);
      }
    } catch {
      setTriageResult({ specialization: null, urgency: "low", reasoning: "Couldn't analyze symptoms right now — try searching manually below." });
    } finally {
      setTriageLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    if (selectedDoctor && date) fetchSlots(selectedDoctor._id, date);
  };

  const handleBookSlot = async () => {
    if (!description.trim()) { setError("Please describe your reason for visit."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await axios.post(
        API + "/book-slot",
        { doctorid: selectedDoctor._id, date: selectedDate, time: selectedSlot, description },
        { headers: { Authorization: `Bearer ${Cookies.get("token")}` }, withCredentials: true }
      );
      if (res.data.success) {
        setSuccess(true);
        window.dispatchEvent(new Event("credits-changed"));
      }
      else setError(res.data.msg || "Booking failed.");
    } catch (err) {
      setError(err.response?.data?.msg || "Error booking slot.");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep(1); setSelectedDoctor(null); setSelectedDate(""); setSlots([]);
    setSelectedSlot(null); setDescription(""); setSuccess(false); setError(""); setSearch("");
  };

  const stepLabel = step === 1 ? "Choose a doctor" : step === 2 ? "Pick a date and time" : "Confirm your booking";

  if (success) {
    return (
      <SuccessScreen
        selectedDoctor={selectedDoctor}
        selectedDate={selectedDate}
        selectedSlot={selectedSlot}
        onReset={reset}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-2 lg:py-2">
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="flex-[1_1_300px]">
          <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-[-0.025em]">Book a slot</h1>
          <p className="mt-1.5 text-[15px] text-[#6B6A8A]">{stepLabel}</p>
        </div>
        <ol aria-label="Booking steps" className="flex gap-2">
          {["Doctor", "Date & time", "Confirm"].map((label, i) => (
            <li key={label} aria-current={step === i + 1 ? "step" : undefined}
              className={`flex items-center gap-2 h-10 pl-1.5 pr-4 rounded-full text-sm font-bold ${step === i + 1 ? "bg-indigo-600 text-white" : step > i + 1 ? "bg-[#E7F7EF] text-[#05603A]" : "bg-white text-[#6B6A8A]"}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${step === i + 1 ? "bg-white text-indigo-600" : "bg-[#F6F6FD]"}`}>{i + 1}</span>
              <span className="hidden sm:inline">{label}</span>
            </li>
          ))}
        </ol>
      </div>

      <div key={step} className="motion-safe:animate-[fadeInUp_0.35s_ease-out_both]">
        {step === 1 && (
          <DoctorSearchStep
            search={search}
            onSearchChange={setSearch}
            loadingDoctors={loadingDoctors}
            filtered={filtered}
            getImageUrl={getImageUrl}
            onSelectDoctor={(doc) => { setSelectedDoctor(doc); setStep(2); setError(""); }}
            symptoms={symptoms}
            onSymptomsChange={setSymptoms}
            onTriage={handleTriage}
            triageLoading={triageLoading}
            triageResult={triageResult}
          />
        )}

        {step === 2 && (
          <DateSlotStep
            selectedDoctor={selectedDoctor}
            getImageUrl={getImageUrl}
            today={today}
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            loadingSlots={loadingSlots}
            hasAppointmentToday={hasAppointmentToday}
            slots={slots}
            selectedSlot={selectedSlot}
            onSelectSlot={(time) => { setSelectedSlot(time); setError(""); }}
            onBack={() => { setStep(1); setSelectedDate(""); setSlots([]); setSelectedSlot(null); }}
            onContinue={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <BookingConfirmStep
            selectedDoctor={selectedDoctor}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            description={description}
            onDescriptionChange={(val) => { setDescription(val); if (error) setError(""); }}
            error={error}
            submitting={submitting}
            onBack={() => setStep(2)}
            onSubmit={handleBookSlot}
          />
        )}
      </div>
    </div>
  );
};

export default SlotBooking;

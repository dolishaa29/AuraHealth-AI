import { formatDate, formatTime } from "../utils/time";

export default function CancelledAppointments({ appointments, doctor = false }) {
  if (!appointments.length) {
    return <p className="text-sm text-[#6B6A8A]">No cancelled appointments.</p>;
  }

  return (
    <ul className="rounded-[28px] bg-white p-6 flex flex-col gap-3">
      {appointments.map((appointment) => (
        <li key={appointment._id} className="rounded-[22px] bg-[#F6F6FD] p-4">
          <p className="font-extrabold break-words">
            {doctor ? appointment.name || appointment.email : appointment.doctormail}
          </p>
          <p className="text-sm text-[#4B4A6B]">
            {formatDate(appointment.date)} · {formatTime(appointment.time)} · Cancelled by doctor
          </p>
          <p className="mt-1 text-sm text-[#4B4A6B]">
            {appointment.refundedCredits > 0
              ? `${appointment.refundedCredits} consultation credits returned`
              : "No consultation credits returned"}
          </p>
        </li>
      ))}
    </ul>
  );
}

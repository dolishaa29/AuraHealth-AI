import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import { Video, MessageCircle, Sparkles, Loader2, CalendarCheck, Mail } from "lucide-react";
import { formatDate, formatTime } from "../utils/time";

const API = import.meta.env.VITE_API_URL;
const authConfig = () => ({ headers: { Authorization: `Bearer ${Cookies.get("emstoken")}` }, withCredentials: true });
const CARD = "bg-white rounded-[28px] shadow-[0_8px_30px_rgba(79,70,229,0.06)]";
const AVATARS = ["bg-[#FFF0E6] text-[#9A3412]", "bg-[#E6F1FF] text-[#1E40AF]", "bg-[#E7F7EF] text-[#05603A]", "bg-[#EEEDFF] text-[#3730A3]", "bg-[#FFECEB] text-[#B42318]"];

const when = (a) => new Date(`${a.date}T${a.time}`);
const initials = (name = "") => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "P";
const dateBits = (a) => {
  const d = new Date(a.date);
  return { month: d.toLocaleDateString("en-IN", { month: "short" }).toUpperCase(), day: String(d.getDate()).padStart(2, "0"), weekday: d.toLocaleDateString("en-IN", { weekday: "long" }) };
};

const Doctorviewapp = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("upcoming");
  const [now] = useState(() => Date.now());
  const [briefingId, setBriefingId] = useState(null);
  const [briefing, setBriefing] = useState(null);

  useEffect(() => {
    axios.get(`${API}/doctorviewapp`, authConfig())
      .then((res) => setAppointments(res.data.appointments || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!briefingId) return;
    const controller = new AbortController();
    axios.get(`${API}/appointment/${briefingId}/briefing`, { ...authConfig(), signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setBriefing({ data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setBriefing({ error: "Couldn't load the brief. Close it and try again." });
      });
    return () => controller.abort();
  }, [briefingId]);

  const { upcoming, past } = useMemo(() => {
    const cutoff = now - 60 * 60 * 1000;
    const sorted = [...appointments].sort((a, b) => when(a) - when(b));
    return { upcoming: sorted.filter((a) => when(a).getTime() >= cutoff), past: sorted.filter((a) => when(a).getTime() < cutoff).reverse() };
  }, [appointments, now]);

  const canStart = (a) => now >= when(a).getTime() - 10 * 60 * 1000;
  const next = upcoming[0];
  const list = tab === "upcoming" ? upcoming.slice(1) : past;

  const toggleBriefing = (appointmentId) => {
    setBriefing(null);
    setBriefingId((current) => current === appointmentId ? null : appointmentId);
  };

  const briefingBox = (a) => {
    if (briefingId !== a._id) return null;
    const data = briefing?.data;
    return (
      <section id={`briefing-${a._id}`} aria-label="Pre-consultation brief" className="w-full grid gap-4 p-5 rounded-[20px] bg-white text-[#312E81] text-sm">
        {!briefing && <p role="status" className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading brief…</p>}
        {briefing?.error && <p role="alert">{briefing.error}</p>}
        {data && (
          <>
            <div>
              <h3 className="font-extrabold">Reason for visit</h3>
              <p className="whitespace-pre-wrap break-words">{data.reason || "No reason provided."}</p>
            </div>
            {data.recordsShared ? (
              <>
                <div>
                  <h3 className="font-extrabold">Recent shared reports</h3>
                  {data.reports.length === 0 && <p>No reports on file.</p>}
                  {data.reports.map((report) => (
                    <details key={report._id} className="mt-2 rounded-xl bg-[#F6F6FD] p-3">
                      <summary className="cursor-pointer font-semibold break-words">
                        {report.title} · {formatDate(report.createdAt.slice(0, 10))}
                      </summary>
                      <p className="mt-2 whitespace-pre-wrap break-words">{report.summary || "No saved summary."}</p>
                      {report.fileUrl?.startsWith("https://") && (
                        <a href={report.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block font-bold text-indigo-700 underline">Open original report</a>
                      )}
                    </details>
                  ))}
                </div>
                {data.adherence && (
                  <div>
                    <h3 className="font-extrabold">Medication dose logs</h3>
                    <p>{formatDate(data.adherence.startDate)} – {formatDate(data.adherence.endDate)}</p>
                    <p>{data.adherence.taken} marked taken · {data.adherence.skipped} marked skipped</p>
                  </div>
                )}
              </>
            ) : <p className="text-[#6B6A8A]">The patient hasn’t shared records for this visit.</p>}
          </>
        )}
      </section>
    );
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-2 lg:py-2">
      <div className="flex flex-col gap-[22px] pb-16">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-[-0.025em]">Your appointments</h1>
        </div>

        <div role="tablist" aria-label="Appointments" className="self-start inline-flex gap-1 p-1.5 rounded-full bg-white shadow-[0_8px_30px_rgba(79,70,229,0.06)]">
          {[["upcoming", `Upcoming · ${upcoming.length}`], ["past", `Past · ${past.length}`]].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setBriefingId(null); }}
              className={`h-10 px-5 rounded-full text-sm font-bold ${tab === id ? "bg-indigo-600 text-white" : "text-[#4B4A6B] hover:text-indigo-600"}`}>{label}</button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-[#6B6A8A] text-sm"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : appointments.length === 0 ? (
          <section className={`${CARD} p-10 text-center`}>
            <span className="mx-auto mb-4 w-16 h-16 rounded-full bg-[#EEEDFF] text-indigo-600 flex items-center justify-center"><CalendarCheck size={28} /></span>
            <h2 className="text-xl font-extrabold">No appointments yet</h2>
            <p className="mt-1.5 text-sm text-[#6B6A8A]">When patients book you, they'll show up here.</p>
          </section>
        ) : (
          <>
            {tab === "upcoming" && next && (
              <section className="relative overflow-hidden rounded-[32px] bg-[#E9E8FF] p-7 flex flex-wrap gap-6 items-center">
                <div aria-hidden="true" className="absolute -left-14 -bottom-24 w-60 h-60 rounded-full bg-[#DAD8FF]" />
                <div className="relative w-[104px] h-28 rounded-[28px] bg-white flex flex-col items-center justify-center shadow-[0_12px_30px_rgba(79,70,229,0.15)]">
                  <span className="text-[13px] font-bold text-indigo-600">{dateBits(next).month}</span>
                  <span className="text-[40px] font-extrabold leading-none">{dateBits(next).day}</span>
                  <span className="text-[13px] font-semibold text-[#6B6A8A]">{dateBits(next).weekday}</span>
                </div>
                <div className="relative flex-[1_1_280px] min-w-0">
                  <span className="inline-flex px-3 py-1 rounded-full bg-white text-indigo-600 text-xs font-extrabold">Next · {formatTime(next.time)}</span>
                  <h2 className="mt-3 mb-1 text-2xl font-extrabold tracking-tight truncate">{next.name || next.email}</h2>
                  <p className="text-[15px] text-[#4B4A6B]">{next.description ? `"${next.description}"` : "No reason given."}</p>
                  {next.email && <p className="mt-1 text-[13px] text-[#6B6A8A] flex items-center gap-1.5"><Mail size={13} /> {next.email}</p>}
                </div>
                <div className="relative flex flex-wrap gap-2.5">
                  <button onClick={() => navigate(`/meeting/${next._id}`)} disabled={!canStart(next)}
                    className="h-12 px-[22px] rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-[15px] font-bold flex items-center gap-2 disabled:opacity-50">
                    <Video size={18} /> {canStart(next) ? "Start call" : "Opens 10 min before"}
                  </button>
                  <button onClick={() => toggleBriefing(next._id)} aria-expanded={briefingId === next._id} className="h-12 px-5 rounded-full bg-white text-[#312E81] text-[15px] font-bold flex items-center gap-2"><Sparkles size={17} /> {briefingId === next._id ? "Hide brief" : "Visit brief"}</button>
                  <button onClick={() => navigate("/doctorchat")} className="h-12 px-5 rounded-full bg-white text-[#312E81] text-[15px] font-bold flex items-center gap-2"><MessageCircle size={17} /> Message</button>
                </div>
                <div className="relative w-full">{briefingBox(next)}</div>
              </section>
            )}

            {list.length > 0 && (
              <section className={`${CARD} p-6 flex flex-col gap-3`}>
                <h2 className="mb-1 text-xl font-extrabold">{tab === "upcoming" ? "Later on" : "Past visits"}</h2>
                {list.map((a, i) => {
                  const d = dateBits(a);
                  return (
                    <div key={a._id} className="flex flex-wrap items-center gap-3.5 p-4 rounded-[22px] bg-[#F6F6FD]">
                      <div className="w-[52px] h-[52px] rounded-[18px] bg-white flex flex-col items-center justify-center">
                        <span className="text-[11px] font-bold text-indigo-600">{d.month}</span>
                        <span className="text-lg font-extrabold leading-none">{d.day}</span>
                      </div>
                      <span className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-extrabold ${AVATARS[i % AVATARS.length]}`}>{initials(a.name)}</span>
                      <div className="flex-[1_1_200px] min-w-0">
                        <p className="text-[15px] font-extrabold truncate">{a.name || a.email}</p>
                        <p className="text-[13px] text-[#6B6A8A] truncate">{formatTime(a.time)}{a.description ? ` · ${a.description}` : ""}</p>
                      </div>
                      <button onClick={() => toggleBriefing(a._id)} aria-expanded={briefingId === a._id} className="h-10 px-4 rounded-full bg-white text-[#3730A3] text-sm font-bold flex items-center gap-1.5">
                        <Sparkles size={14} /> {briefingId === a._id ? "Hide brief" : "Visit brief"}
                      </button>
                      {briefingBox(a)}
                    </div>
                  );
                })}
              </section>
            )}
            {tab === "past" && past.length === 0 && <p className="text-sm text-[#6B6A8A]">No past visits yet.</p>}
          </>
        )}
      </div>
    </div>
  );
};

export default Doctorviewapp;

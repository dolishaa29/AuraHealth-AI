import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, CalendarClock, CheckCircle2, Users, Video, MessageCircle, Sparkles, Loader2, AlertCircle, RefreshCw, Check } from 'lucide-react';
import { todayStr, formatTime } from '../utils/time';
import DashboardAnalytics from '../components/DashboardAnalytics';

const API = import.meta.env.VITE_API_URL;
const authConfig = () => ({ headers: { Authorization: `Bearer ${Cookies.get("emstoken")}` }, withCredentials: true });
const CARD = "bg-white rounded-[28px] shadow-[0_8px_30px_rgba(79,70,229,0.06)]";
const AVATARS = ["bg-[#FFF0E6] text-[#9A3412]", "bg-[#E6F1FF] text-[#1E40AF]", "bg-[#E7F7EF] text-[#05603A]", "bg-[#EEEDFF] text-[#3730A3]", "bg-[#FFECEB] text-[#B42318]"];

const when = (a) => new Date(`${a.date}T${a.time}`);
const initials = (name = "") => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "P";
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const Docterdashboard = () => {
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState({ name: "", email: "", contact: "" });
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now] = useState(() => Date.now());
  const [briefing, setBriefing] = useState({ loading: false, text: "", forId: null });

  const loadAll = async () => {
    setLoading(true);
    setError("");
    const [dash, apps] = await Promise.allSettled([
      axios.get(`${API}/doctordashboard`, authConfig()),
      axios.get(`${API}/doctorviewapp`, authConfig()),
    ]);
    if (dash.status === 'fulfilled') setDoctor(dash.value.data.dashboard || {});
    if (apps.status === 'fulfilled') setAppointments(apps.value.data.appointments || []);
    if (dash.status === 'rejected' || apps.status === 'rejected') setError("Couldn't load some of your data.");
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const loadBriefing = async (appointment) => {
    setBriefing({ loading: true, text: "", forId: appointment._id });
    try {
      const res = await axios.get(`${API}/appointment/${appointment._id}/briefing`, authConfig());
      setBriefing((current) => current.forId === appointment._id
        ? { loading: false, data: res.data, forId: appointment._id }
        : current);
    } catch {
      setBriefing((current) => current.forId === appointment._id
        ? { loading: false, text: "Couldn't prepare a briefing right now. Please try again.", forId: appointment._id }
        : current);
    }
  };

  const today = todayStr();
  const sorted = [...appointments].sort((a, b) => when(a) - when(b));
  const todays = sorted.filter((a) => a.date === today);

  const upcoming = sorted.filter((a) => when(a).getTime() >= now - 60 * 60 * 1000);
  const past = sorted.filter((a) => when(a).getTime() < now - 60 * 60 * 1000);
  const next = upcoming[0];
  const patients = new Set(appointments.map((a) => a.userid || a.email)).size;
  const canStart = (a) => now >= when(a).getTime() - 10 * 60 * 1000;
  const firstName = (doctor.name || "").split(" ")[0] || "Doctor";
  const nextPatient = next ? appointments.find((a) => a._id === next._id) : null;

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-2 lg:py-2">
      <div className="flex flex-col gap-[22px] pb-16">

        {error && (
          <div className="flex items-center justify-between gap-4 px-5 py-3 rounded-[20px] bg-[#FFECEB] text-[#B42318] text-sm font-semibold">
            <span className="flex items-center gap-2"><AlertCircle size={16} /> {error}</span>
            <button onClick={loadAll} className="flex items-center gap-1.5 font-bold"><RefreshCw size={14} /> Retry</button>
          </div>
        )}

        <div>
          <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-[-0.025em]">{greeting()}, Dr. {firstName}</h1>
          <p className="mt-1.5 text-[15px] text-[#6B6A8A]">
            {loading ? "Loading your day…" : todays.length ? `You have ${todays.length} patient${todays.length === 1 ? "" : "s"} today.` : "No patients booked for today."}
          </p>
        </div>

        <section className="relative overflow-hidden rounded-[32px] bg-[#E9E8FF] p-6 sm:p-8 flex flex-wrap items-center gap-6">
          <div aria-hidden="true" className="absolute -right-14 -top-20 w-72 h-72 rounded-full bg-[#DAD8FF]" />
          <div aria-hidden="true" className="absolute right-28 -bottom-24 w-52 h-52 rounded-full bg-[#D2CFFF]" />
          {loading ? (
            <div className="relative flex items-center gap-2 text-[#4B4A6B]"><Loader2 size={18} className="animate-spin" /> Loading…</div>
          ) : nextPatient ? (
            <>
              <div className="relative flex-[1_1_340px] min-w-0">
                <span className="inline-flex px-3.5 py-1.5 rounded-full bg-white text-indigo-600 text-[13px] font-bold">
                  Next patient · {nextPatient.date === today ? "Today" : new Date(nextPatient.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {formatTime(nextPatient.time)}
                </span>
                <h2 className="mt-4 mb-1.5 text-2xl sm:text-[28px] font-extrabold tracking-tight truncate">{nextPatient.name || nextPatient.email}</h2>
                <p className="mb-5 text-[15px] text-[#4B4A6B] line-clamp-2">{nextPatient.description ? `"${nextPatient.description}"` : "No reason given."}</p>
                <div className="flex flex-wrap gap-2.5">
                  <button onClick={() => navigate(`/meeting/${nextPatient._id}`)} disabled={!canStart(nextPatient)} title={canStart(nextPatient) ? "" : "Opens 10 minutes before the slot"}
                    className="h-12 px-6 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-[15px] font-bold flex items-center gap-2 disabled:opacity-50 shadow-[0_10px_20px_-6px_rgba(79,70,229,0.5)]">
                    <Video size={18} /> {canStart(nextPatient) ? "Start call" : "Opens 10 min before"}
                  </button>
                  <button onClick={() => loadBriefing(nextPatient)} className="h-12 px-[22px] rounded-full bg-white text-[#312E81] text-[15px] font-bold flex items-center gap-2">
                    <Sparkles size={17} /> Patient briefing
                  </button>
                  <button onClick={() => navigate('/doctorchat')} className="h-12 px-5 rounded-full bg-white text-[#312E81] text-[15px] font-bold flex items-center gap-2">
                    <MessageCircle size={17} /> Message
                  </button>
                </div>
              </div>
              <div className="relative hidden sm:flex w-[132px] h-[132px] rounded-full bg-white text-indigo-600 items-center justify-center text-[40px] font-extrabold shadow-[0_16px_40px_rgba(79,70,229,0.18)]">
                {initials(nextPatient.name)}
              </div>
            </>
          ) : (
            <div className="relative">
              <h2 className="text-2xl sm:text-[28px] font-extrabold tracking-tight">No upcoming patients</h2>
              <p className="mt-1.5 text-[15px] text-[#4B4A6B]">New bookings will show up here.</p>
            </div>
          )}
        </section>

        {briefing.forId && (
          <section className="rounded-[28px] bg-[#FFF0E6] p-6">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#7C2D12]"><Sparkles size={18} /> Patient briefing</h2>
              <button onClick={() => setBriefing({ loading: false, text: "", forId: null })} className="text-sm font-bold text-[#9A3412]">Close</button>
            </div>
            {briefing.loading
              ? <p className="flex items-center gap-2 text-sm text-[#9A3412]"><Loader2 size={15} className="animate-spin" /> Reading past reports and visits…</p>
              : briefing.data ? (
                <div className="grid gap-2 text-sm text-[#7C2D12]">
                  <p><strong>Reason for visit</strong> · {briefing.data.reason || "No reason provided."}</p>
                  {briefing.data.recordsShared ? (
                    <>
                      <p>{briefing.data.reports.length} recent shared reports</p>
                      {briefing.data.adherence && <p>Last seven days · {briefing.data.adherence.taken} doses marked taken · {briefing.data.adherence.skipped} marked skipped</p>}
                      <button onClick={() => navigate('/doctorviewapp')} className="justify-self-start font-bold underline">Open appointments to view reports</button>
                    </>
                  ) : <p>The patient hasn’t shared records for this visit.</p>}
                </div>
              ) : <p role="alert" className="text-sm text-[#7C2D12]">{briefing.text}</p>}
          </section>
        )}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <Tile onClick={() => navigate('/doctorviewapp')} bg="bg-[#EEEDFF]" fg="text-[#3730A3]" icon={CalendarCheck} value={todays.length} label="patients today" />
          <Tile onClick={() => navigate('/doctorviewapp')} bg="bg-[#E6F1FF]" fg="text-[#1E40AF]" icon={CalendarClock} value={upcoming.length} label="upcoming visits" />
          <Tile onClick={() => navigate('/doctorviewapp')} bg="bg-[#E7F7EF]" fg="text-[#05603A]" icon={CheckCircle2} value={past.length} label="past bookings" />
          <Tile onClick={() => navigate('/doctorchat')} bg="bg-[#FFF0E6]" fg="text-[#9A3412]" icon={Users} value={patients} label="patients in total" />
        </div>

        <DashboardAnalytics role="doctor" />

        <div className="flex flex-wrap gap-5 items-start">

          <section className={`${CARD} flex-[999_1_440px] min-w-0 p-6`}>
            <div className="flex items-center justify-between mb-[18px]">
              <h2 className="text-xl font-extrabold">Today's schedule</h2>
              <button onClick={() => navigate('/doctorviewapp')} className="text-sm font-bold text-indigo-600">See all</button>
            </div>
            {todays.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#6B6A8A]">No patients booked for today. Enjoy the breather.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {todays.map((a, i) => {
                  const start = when(a).getTime();
                  const done = start < now - 60 * 60 * 1000;
                  const live = !done && canStart(a);
                  return (
                    <div key={a._id} className={`flex flex-wrap items-center gap-3.5 px-4 py-3.5 rounded-[20px] ${live ? "bg-[#FFF4E5]" : "bg-[#F6F6FD]"}`}>
                      <span className={`w-12 text-sm font-extrabold ${live ? "text-[#B45309]" : "text-[#6B6A8A]"}`}>{formatTime(a.time).replace(" ", " ")}</span>
                      <span className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-extrabold ${AVATARS[i % AVATARS.length]}`}>{initials(a.name)}</span>
                      <div className="flex-[1_1_160px] min-w-0">
                        <p className="text-[15px] font-bold truncate">{a.name || a.email}</p>
                        <p className="text-[13px] text-[#6B6A8A] truncate">{a.description || "No reason given"}</p>
                      </div>
                      {done ? (
                        <span className="px-3 py-1.5 rounded-full bg-white text-[#05603A] text-xs font-extrabold flex items-center gap-1"><Check size={13} strokeWidth={3} /> Done</span>
                      ) : live ? (
                        <button onClick={() => navigate(`/meeting/${a._id}`)} className="h-10 px-[18px] rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center gap-1.5"><Video size={15} /> Start</button>
                      ) : (
                        <button onClick={() => loadBriefing(a)} className="h-10 px-4 rounded-full bg-white text-[#3730A3] text-sm font-bold flex items-center gap-1.5"><Sparkles size={14} /> Brief</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <div className="flex-[1_1_300px] min-w-0 flex flex-col gap-5">
            <section className={`${CARD} p-6`}>
              <h2 className="mb-3.5 text-lg font-extrabold">Quick actions</h2>
              <div className="flex flex-wrap gap-2">
                {[
                  ['All appointments', '/doctorviewapp'],
                  ['Messages', '/doctorchat'],
                  ['Edit profile', '/doctorprofile'],
                ].map(([label, path]) => (
                  <button key={path} onClick={() => navigate(path)} className="h-[42px] px-4 rounded-full bg-[#EEEDFF] text-[#3730A3] text-sm font-bold hover:bg-[#E0DEFF]">{label}</button>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] bg-[#E7F7EF] p-6 flex gap-3.5 items-start">
              <span className="w-[46px] h-[46px] shrink-0 rounded-full bg-white text-[#05603A] flex items-center justify-center"><Sparkles size={20} /></span>
              <div>
                <h2 className="text-base font-extrabold text-[#054F31]">Tip: use the AI briefing</h2>
                <p className="mt-1 text-sm text-[#05603A]">Before each call, get a quick summary of the patient's past reports and visits.</p>
              </div>
            </section>

            <section className={`${CARD} p-6 flex items-center gap-3.5`}>
              <span className="w-12 h-12 shrink-0 rounded-full bg-[#FFE8D9] text-[#9A3412] flex items-center justify-center font-extrabold">{initials(doctor.name)}</span>
              <div className="min-w-0">
                <p className="text-base font-extrabold truncate">Dr. {doctor.name || "—"}</p>
                <p className="text-[13px] text-[#6B6A8A] truncate">{doctor.email}</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

const Tile = ({ onClick, bg, fg, icon: Icon, value, label }) => (
  <button onClick={onClick} className={`flex flex-col gap-3.5 p-[22px] rounded-[26px] text-left ${bg} ${fg} hover:-translate-y-0.5 transition-transform`}>
    <span className="w-11 h-11 rounded-full bg-white flex items-center justify-center"><Icon size={20} /></span>
    <span>
      <span className="block text-[28px] font-extrabold leading-tight">{value}</span>
      <span className="text-sm font-semibold">{label}</span>
    </span>
  </button>
);

export default Docterdashboard;

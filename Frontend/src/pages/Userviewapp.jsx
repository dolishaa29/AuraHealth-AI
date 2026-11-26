import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';
import { Plus, Video, MessageCircle, Star, CalendarCheck, Loader2 } from 'lucide-react';
import { formatTime } from '../utils/time';
import MedicineChanges from '../components/MedicineChanges';
import CancelledAppointments from '../components/CancelledAppointments';

const CARD = "bg-white rounded-[28px] shadow-[0_8px_30px_rgba(79,70,229,0.06)]";
const API = import.meta.env.VITE_API_URL;
const authConfig = () => ({ headers: { Authorization: `Bearer ${Cookies.get("token")}` }, withCredentials: true });
const when = (a) => new Date(`${a.date}T${a.time}:00+05:30`);
const dateBits = (a) => {
  const d = new Date(a.date);
  return {
    month: d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
    day: String(d.getDate()).padStart(2, '0'),
    weekday: d.toLocaleDateString('en-IN', { weekday: 'long' }),
  };
};

const Userviewapp = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [cancelledAppointments, setCancelledAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');
  const [now] = useState(() => Date.now());
  const [sharingId, setSharingId] = useState(null);
  const [sharingError, setSharingError] = useState("");

  useEffect(() => {
    axios
      .get(`${API}/userviewapp`, authConfig())
      .then(({ data }) => {
        setAppointments(data.appointments || []);
        setCancelledAppointments(data.cancelledAppointments || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { upcoming, past } = useMemo(() => {
    const cutoff = now - 60 * 60 * 1000;
    const sorted = [...appointments].sort((a, b) => when(a) - when(b));
    return {
      upcoming: sorted.filter((a) => when(a).getTime() >= cutoff),
      past: sorted.filter((a) => when(a).getTime() < cutoff).reverse(),
    };
  }, [appointments, now]);

  const next = upcoming[0];
  const list = tab === 'upcoming' ? upcoming.slice(1) : past;
  const canJoin = (a) => now >= when(a).getTime() - 10 * 60 * 1000;

  const updateSharing = async (appointment, shareBriefingRecords) => {
    setSharingId(appointment._id);
    setSharingError("");
    try {
      const { data } = await axios.put(`${API}/appointment/${appointment._id}/briefing-sharing`, { shareBriefingRecords }, authConfig());
      setAppointments((items) => items.map((item) =>
        item._id === appointment._id ? { ...item, shareBriefingRecords: data.shareBriefingRecords } : item
      ));
    } catch {
      setSharingError("Couldn't update record sharing. Please try again.");
    } finally {
      setSharingId(null);
    }
  };

  const sharingControl = (appointment) => (
    <label className="flex w-full items-start gap-2.5 rounded-2xl bg-white p-3 text-sm text-[#4B4A6B]">
      <input type="checkbox" className="mt-1 accent-indigo-600" checked={appointment.shareBriefingRecords === true}
        disabled={sharingId !== null} onChange={(event) => updateSharing(appointment, event.target.checked)} />
      <span>
        <strong className="block text-[#312E81]">Share records for this visit</strong>
        Let this doctor see your five most recent reports and seven days of dose-log totals.
      </span>
    </label>
  );

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-2 lg:py-2">
      <div className="flex flex-col gap-[22px] pb-24">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-[1_1_300px]">
            <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-[-0.025em]">Your appointments</h1>
            <p className="mt-1.5 text-[15px] text-[#6B6A8A]">Everything you've booked, in one place.</p>
          </div>
          <button onClick={() => navigate('/SlotBooking')} className="inline-flex items-center gap-2 h-12 px-[22px] rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-[15px] font-bold shadow-[0_10px_20px_-6px_rgba(79,70,229,0.5)]">
            <Plus size={18} strokeWidth={2.4} /> New booking
          </button>
        </div>

        <div role="tablist" aria-label="Appointments" className="self-start inline-flex gap-1 p-1.5 rounded-full bg-white shadow-[0_8px_30px_rgba(79,70,229,0.06)]">
          {[['upcoming', `Upcoming · ${upcoming.length}`], ['past', `Past · ${past.length}`], ['cancelled', `Cancelled · ${cancelledAppointments.length}`]].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`h-10 px-5 rounded-full text-sm font-bold ${tab === id ? 'bg-indigo-600 text-white' : 'text-[#4B4A6B] hover:text-indigo-600'}`}>
              {label}
            </button>
          ))}
        </div>

        {sharingError && <p role="alert" className="text-sm text-[#B42318]">{sharingError}</p>}
        {loading ? (
          <div className="flex items-center gap-2 text-[#6B6A8A] text-sm"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : tab === 'cancelled' ? (
          <CancelledAppointments appointments={cancelledAppointments} />
        ) : appointments.length === 0 && cancelledAppointments.length === 0 ? (
          <section className={`${CARD} p-10 text-center`}>
            <span className="mx-auto mb-4 w-16 h-16 rounded-full bg-[#EEEDFF] text-indigo-600 flex items-center justify-center"><CalendarCheck size={28} /></span>
            <h2 className="text-xl font-extrabold">No appointments yet</h2>
            <p className="mt-1.5 mb-5 text-sm text-[#6B6A8A]">Book a verified doctor in under a minute.</p>
            <button onClick={() => navigate('/ViewDoctorss')} className="h-12 px-6 rounded-full bg-indigo-600 text-white font-bold">Find a doctor</button>
          </section>
        ) : (
          <>
            {tab === 'upcoming' && next && (
              <section className="relative overflow-hidden rounded-[32px] bg-[#E9E8FF] p-7 flex flex-wrap gap-6 items-center">
                <div aria-hidden="true" className="absolute -left-14 -bottom-24 w-60 h-60 rounded-full bg-[#DAD8FF]" />
                <div className="relative w-[104px] h-28 rounded-[28px] bg-white flex flex-col items-center justify-center shadow-[0_12px_30px_rgba(79,70,229,0.15)]">
                  <span className="text-[13px] font-bold text-indigo-600">{dateBits(next).month}</span>
                  <span className="text-[40px] font-extrabold leading-none">{dateBits(next).day}</span>
                  <span className="text-[13px] font-semibold text-[#6B6A8A]">{dateBits(next).weekday}</span>
                </div>
                <div className="relative flex-[1_1_280px] min-w-0">
                  <span className="inline-flex px-3 py-1 rounded-full bg-white text-[#05603A] text-xs font-extrabold">Confirmed</span>
                  <h2 className="mt-3 mb-1 text-2xl font-extrabold tracking-tight break-words">{next.doctormail} · {formatTime(next.time)}</h2>
                  {next.description && <p className="text-[15px] text-[#4B4A6B]">"{next.description}"</p>}
                </div>
                <div className="relative flex flex-wrap gap-2.5">
                  <button onClick={() => navigate(`/meeting/${next._id}`)} disabled={!canJoin(next)} title={canJoin(next) ? '' : 'Opens 10 minutes before your slot'}
                    className="h-12 px-[22px] rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-[15px] font-bold flex items-center gap-2 disabled:opacity-50">
                    <Video size={18} /> {canJoin(next) ? 'Join call' : 'Opens 10 min before'}
                  </button>
                  <button onClick={() => navigate('/userchat')} className="h-12 px-5 rounded-full bg-white text-[#312E81] text-[15px] font-bold flex items-center gap-2"><MessageCircle size={18} /> Message</button>
                </div>
                <div className="relative w-full">{sharingControl(next)}</div>
                <MedicineChanges appointment={next} />
              </section>
            )}

            {list.length > 0 && (
              <section className={`${CARD} p-6 flex flex-col gap-3`}>
                <h2 className="mb-1 text-xl font-extrabold">{tab === 'upcoming' ? 'Later on' : 'Past visits'}</h2>
                {list.map((a) => {
                  const d = dateBits(a);
                  return (
                    <div key={a._id} className="flex flex-wrap items-center gap-3.5 p-4 rounded-[22px] bg-[#F6F6FD]">
                      <div className="w-[52px] h-[52px] rounded-[18px] bg-white flex flex-col items-center justify-center">
                        <span className="text-[11px] font-bold text-indigo-600">{d.month}</span>
                        <span className="text-lg font-extrabold leading-none">{d.day}</span>
                      </div>
                      <div className="flex-[1_1_200px] min-w-0">
                        <p className="text-[15px] font-extrabold truncate">{a.doctormail}</p>
                        <p className="text-[13px] text-[#6B6A8A] truncate">{formatTime(a.time)}{a.description ? ` · ${a.description}` : ''}</p>
                      </div>
                      {tab === 'past' ? (
                        <button onClick={() => navigate(`/rating/${a.doctorid}`)} className="h-10 px-[18px] rounded-full bg-[#EEEDFF] text-[#3730A3] text-sm font-bold flex items-center gap-1.5"><Star size={15} /> Rate visit</button>
                      ) : (
                        <span className="px-3.5 py-1.5 rounded-full bg-white text-[#05603A] text-[13px] font-extrabold">Confirmed</span>
                      )}
                      {sharingControl(a)}
                      <MedicineChanges appointment={a} />
                    </div>
                  );
                })}
              </section>
            )}

            {tab === 'past' && past.length === 0 && <p className="text-sm text-[#6B6A8A]">No past visits yet.</p>}
            {tab === 'upcoming' && !next && <p className="text-sm text-[#6B6A8A]">No upcoming visits.</p>}
          </>
        )}
      </div>
    </div>
  );
};

export default Userviewapp;

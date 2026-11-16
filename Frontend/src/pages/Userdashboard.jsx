import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';
import { Pill, Coins, FileText, MapPin, Check, ShieldAlert, AlertCircle, RefreshCw } from 'lucide-react';
import HealthBot from '../components/bot';
import { todayStr, nowTimeStr, toMinutes, formatTime } from '../utils/time';

const API = import.meta.env.VITE_API_URL;
const authConfig = () => ({ headers: { Authorization: `Bearer ${Cookies.get("token")}` }, withCredentials: true });

const MOODS = [
  { id: 'great', label: 'Feeling great', on: 'bg-[#E7F7EF] text-[#05603A]' },
  { id: 'okay', label: 'Doing okay', on: 'bg-[#EEEDFF] text-[#3730A3]' },
  { id: 'unwell', label: 'Not so well', on: 'bg-[#FFF0E6] text-[#9A3412]' },
];

const initials = (text = '') => text.replace(/^dr\.?\s*/i, '').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'DR';

const Userdashboard = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [doses, setDoses] = useState([]);
  const [credits, setCredits] = useState(null);
  const [reportCount, setReportCount] = useState(null);
  const [contactCount, setContactCount] = useState(null);
  const [mood, setMood] = useState(null);
  const [error, setError] = useState('');

  const loadAll = async () => {
    setError('');
    const results = await Promise.allSettled([
      axios.get(`${API}/userdashboard`, authConfig()),
      axios.get(`${API}/userviewapp`, authConfig()),
      axios.get(`${API}/reminders/today?date=${todayStr()}`, authConfig()),
      axios.get(`${API}/credits`, authConfig()),
      axios.get(`${API}/report`, authConfig()),
      axios.get(`${API}/emergency-contacts`, authConfig()),
    ]);
    const [dash, apps, today, wallet, reports, contacts] = results.map((r) => (r.status === 'fulfilled' ? r.value.data : null));
    if (dash) setName(dash.dashboard?.name || '');
    if (apps) setAppointments(apps.appointments || []);
    if (today) setDoses(today.doses || []);
    if (wallet) setCredits(wallet.balance);
    if (reports) setReportCount((reports.reports || []).length);
    if (contacts) setContactCount((contacts.contacts || []).length);
    if (!dash || !apps) setError("Couldn't load some of your data.");
  };

  useEffect(() => {
    loadAll();
    window.addEventListener('reminders-changed', loadAll);
    return () => window.removeEventListener('reminders-changed', loadAll);
  }, []);

  const markTaken = async (dose) => {
    await axios.post(`${API}/reminders/dose`, { reminderId: dose.reminderId, date: todayStr(), time: dose.time, status: 'taken' }, authConfig()).catch(() => {});
    window.dispatchEvent(new Event('reminders-changed'));
  };

  const now = new Date();
  const next = appointments
    .filter((a) => new Date(`${a.date}T${a.time}`) > now)
    .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))[0];
  const taken = doses.filter((d) => d.status === 'taken').length;
  const nowMin = toMinutes(nowTimeStr());
  const firstName = name.split(' ')[0] || 'there';

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-2 lg:py-2">
      <div className="flex flex-col gap-[22px] pb-24">

        {error && (
          <div className="flex items-center justify-between gap-4 px-5 py-3 rounded-[20px] bg-[#FFECEB] text-[#B42318] text-sm font-semibold">
            <span className="flex items-center gap-2"><AlertCircle size={16} /> {error}</span>
            <button onClick={loadAll} className="flex items-center gap-1.5 font-bold"><RefreshCw size={14} /> Retry</button>
          </div>
        )}

        <div>
          <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-[-0.025em]">Hi {firstName}, how are you feeling today?</h1>
          <div role="group" aria-label="How are you feeling" className="flex flex-wrap gap-2 mt-3.5">
            {MOODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMood(m.id)}
                aria-pressed={mood === m.id}
                className={`h-10 px-[18px] rounded-full text-sm font-bold transition-colors ${mood === m.id ? m.on : 'bg-white text-[#4B4A6B] shadow-[inset_0_0_0_1px_#E4E3F5] hover:text-indigo-600'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <section className="relative overflow-hidden rounded-[32px] bg-[#E9E8FF] p-6 sm:p-8 flex flex-wrap items-center gap-6">
          <div aria-hidden="true" className="absolute -right-14 -top-20 w-72 h-72 rounded-full bg-[#DAD8FF]" />
          <div aria-hidden="true" className="absolute right-28 -bottom-24 w-52 h-52 rounded-full bg-[#D2CFFF]" />
          {next ? (
            <>
              <div className="relative flex-[1_1_320px]">
                <span className="inline-flex px-3.5 py-1.5 rounded-full bg-white text-indigo-600 text-[13px] font-bold">
                  {new Date(next.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {formatTime(next.time)}
                </span>
                <h2 className="mt-4 mb-1.5 text-2xl sm:text-[28px] font-extrabold tracking-tight">Your visit with {next.doctormail}</h2>
                <p className="mb-5 text-[15px] text-[#4B4A6B]">Keep your recent reports handy; your doctor can see them before the call.</p>
                <div className="flex flex-wrap gap-2.5">
                  <button onClick={() => navigate(`/meeting/${next._id}`)} className="h-12 px-6 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-[15px] font-bold shadow-[0_10px_20px_-6px_rgba(79,70,229,0.5)]">Join when ready</button>
                  <button onClick={() => navigate('/userviewapp')} className="h-12 px-[22px] rounded-full bg-white text-[#312E81] text-[15px] font-bold">All appointments</button>
                </div>
              </div>
              <div className="relative hidden sm:flex w-[132px] h-[132px] rounded-full bg-white text-indigo-600 items-center justify-center text-[40px] font-extrabold shadow-[0_16px_40px_rgba(79,70,229,0.18)]">
                {initials(next.doctormail)}
              </div>
            </>
          ) : (
            <div className="relative flex-1">
              <h2 className="text-2xl sm:text-[28px] font-extrabold tracking-tight">No visits coming up</h2>
              <p className="mt-1.5 mb-5 text-[15px] text-[#4B4A6B]">Book a verified doctor in under a minute.</p>
              <button onClick={() => navigate('/ViewDoctorss')} className="h-12 px-6 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-[15px] font-bold">Find a doctor</button>
            </div>
          )}
        </section>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <Tile onClick={() => navigate('/reminders')} bg="bg-[#E7F7EF]" fg="text-[#05603A]" icon={Pill} value={doses.length ? `${taken} of ${doses.length}` : '0'} label={doses.length ? 'medicines taken today' : 'medicines today'} />
          <Tile onClick={() => navigate('/credits')} bg="bg-[#EEEDFF]" fg="text-[#3730A3]" icon={Coins} value={credits ?? '—'} label="credits available" />
          <Tile onClick={() => navigate('/ReportAnalysis')} bg="bg-[#FFF0E6]" fg="text-[#9A3412]" icon={FileText} value={reportCount == null ? '—' : `${reportCount} report${reportCount === 1 ? '' : 's'}`} label="explained simply" />
          <Tile onClick={() => navigate('/NearbyHospitals')} bg="bg-[#E6F1FF]" fg="text-[#1E40AF]" icon={MapPin} value="Nearby" label="hospitals around you" />
        </div>

        <div className="flex flex-wrap gap-5 items-start">

          <section className="flex-[999_1_420px] min-w-0 bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgba(79,70,229,0.06)]">
            <div className="flex items-center justify-between mb-[18px]">
              <h2 className="text-xl font-extrabold">Today's medicines</h2>
              <button onClick={() => navigate('/reminders')} className="text-sm font-bold text-indigo-600">See all</button>
            </div>
            {doses.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-[#6B6A8A] mb-3">No medicines scheduled for today.</p>
                <button onClick={() => navigate('/reminders')} className="h-11 px-5 rounded-full bg-[#EEEDFF] text-[#3730A3] text-sm font-bold">Add a reminder</button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {doses.map((d) => {
                  const due = !d.status && toMinutes(d.time) <= nowMin;
                  return (
                    <div key={d.reminderId + d.time} className={`flex items-center gap-3.5 px-4 py-3.5 rounded-[20px] ${due ? 'bg-[#FFF4E5]' : 'bg-[#F6F6FD]'}`}>
                      {d.status === 'taken' ? (
                        <span className="w-10 h-10 shrink-0 rounded-full bg-indigo-600 text-white flex items-center justify-center"><Check size={18} strokeWidth={3} /></span>
                      ) : (
                        <span className={`w-10 h-10 shrink-0 rounded-full bg-white ${due ? 'border-2 border-dashed border-amber-500' : 'border-2 border-[#E4E3F5]'}`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-bold truncate">{d.medicine}</p>
                        <p className={`text-[13px] ${due ? 'font-semibold text-[#B45309]' : 'text-[#6B6A8A]'}`}>
                          {formatTime(d.time)}{d.dosage ? ` · ${d.dosage}` : ''} · {d.status === 'taken' ? 'done' : d.status === 'skipped' ? 'skipped' : due ? "it's time" : 'later'}
                        </p>
                      </div>
                      {due && (
                        <button onClick={() => markTaken(d)} className="h-[42px] px-[18px] rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold">I took it</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <div className="flex-[1_1_300px] min-w-0 flex flex-col gap-5">
            <section className="bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgba(79,70,229,0.06)]">
              <h2 className="mb-3.5 text-lg font-extrabold">Need something?</h2>
              <div className="flex flex-wrap gap-2">
                {[
                  ['Book a doctor', '/ViewDoctorss'],
                  ['Read a report', '/ReportAnalysis'],
                  ['Scan my skin', '/LiveCapture'],
                  ['Message a doctor', '/userchat'],
                ].map(([label, path]) => (
                  <button key={path} onClick={() => navigate(path)} className="h-[42px] px-4 rounded-full bg-[#EEEDFF] text-[#3730A3] text-sm font-bold hover:bg-[#E0DEFF]">{label}</button>
                ))}
              </div>
            </section>

            <section className="bg-[#FFECEB] rounded-[28px] p-6 flex gap-3.5 items-start">
              <span className="w-[46px] h-[46px] shrink-0 rounded-full bg-white text-[#D92D20] flex items-center justify-center"><ShieldAlert size={20} /></span>
              <div>
                <h2 className="text-base font-extrabold text-[#7A271A]">{contactCount ? "You're covered" : 'Add your safety circle'}</h2>
                <p className="mt-1 mb-2.5 text-sm text-[#7A271A]">
                  {contactCount
                    ? `${contactCount} contact${contactCount === 1 ? '' : 's'} get your location if you hold SOS for 2 seconds.`
                    : 'Add family who should get your location when you hold SOS.'}
                </p>
                <button onClick={() => navigate('/emergency-contacts')} className="text-sm font-bold text-[#B42318] underline underline-offset-2">
                  {contactCount ? 'Edit contacts' : 'Add contacts'}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      <HealthBot raised />
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

export default Userdashboard;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock, FileText, Video, Sparkles, ArrowRight, Stethoscope,
  MapPin, TrendingUp, ClipboardList, Pill, ShieldAlert,
} from 'lucide-react';

const HERO_POINTS = [
  { icon: <CalendarClock size={16} />, label: 'Auto slot booking', tint: 'bg-[#EEEDFF] text-[#3730A3]' },
  { icon: <FileText size={16} />, label: 'AI report summaries', tint: 'bg-[#FFF0E6] text-[#9A3412]' },
  { icon: <Pill size={16} />, label: 'Medicine reminders', tint: 'bg-[#E7F7EF] text-[#05603A]' },
  { icon: <Video size={16} />, label: 'Live video visits', tint: 'bg-[#E6F1FF] text-[#1E40AF]' },
];

const AVATARS = [
  { initials: 'AK', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  { initials: 'RS', bg: 'bg-violet-100', text: 'text-violet-700' },
  { initials: 'MP', bg: 'bg-indigo-200', text: 'text-indigo-800' },
];

const HEADLINES = [
  ['Book, Consult, Follow Up —', 'All Without Leaving Home'],
  ['See a Doctor Today,', 'Not Next Week'],
  ['Every Report, Every Message —', 'All in One Place'],
];

const WIDGETS = [
  { icon: <Sparkles size={15} />, label: 'AI Symptom Triage', tint: 'bg-[#EEEDFF] text-indigo-600' },
  { icon: <FileText size={15} />, label: 'Instant Report Analysis', tint: 'bg-[#FFF0E6] text-[#9A3412]' },
  { icon: <MapPin size={15} />, label: 'Nearby Hospitals', tint: 'bg-[#E6F1FF] text-[#1E40AF]' },
  { icon: <TrendingUp size={15} />, label: 'Health Trend Insights', tint: 'bg-[#E7F7EF] text-[#05603A]' },
  { icon: <ClipboardList size={15} />, label: 'AI Visit Briefing', tint: 'bg-[#EEEDFF] text-indigo-600' },
  { icon: <Video size={15} />, label: 'Live Video Consult', tint: 'bg-[#FFECEB] text-[#B42318]' },
];

const WIDGET_POSITIONS = [
  'absolute -right-10 top-14 hidden sm:flex',
  'absolute -left-12 bottom-28 hidden sm:flex',
  'absolute -right-8 bottom-4 hidden sm:flex',
];

const Hero = () => {
  const navigate = useNavigate();
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setHeadlineIndex((i) => (i + 1) % HEADLINES.length), 4500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % WIDGETS.length), 3200);
    return () => clearInterval(id);
  }, []);

  const [line1, line2] = HEADLINES[headlineIndex];
  const visibleWidgets = WIDGET_POSITIONS.map((_, slot) => WIDGETS[(tick + slot * 2) % WIDGETS.length]);

  return (
    <section className="relative overflow-hidden bg-[#F6F6FD]">
      <div className="motion-safe:animate-[floatSlow_9s_ease-in-out_infinite] absolute top-[-10%] left-[-5%] w-[28rem] h-[28rem] bg-[#DAD8FF]/70 blur-[100px] rounded-full" />
      <div className="motion-safe:animate-[floatSlower_11s_ease-in-out_infinite] absolute top-[5%] right-[-5%] w-[26rem] h-[26rem] bg-[#FFE0CC]/70 blur-[100px] rounded-full" />

      <div className="relative max-w-4xl mx-auto px-6 pt-32 pb-4 md:pt-40 text-center">
        <div
          className="motion-safe:animate-[fadeInUp_0.6s_ease-out_both] inline-flex items-center gap-3 px-3 py-2 pr-4 bg-white rounded-full shadow-[0_8px_24px_rgba(79,70,229,0.1)] mb-8"
        >
          <div className="flex -space-x-2">
            {AVATARS.map((a) => (
              <div
                key={a.initials}
                className={`w-6 h-6 rounded-full ring-2 ring-white flex items-center justify-center text-[9px] font-bold ${a.bg} ${a.text}`}
              >
                {a.initials}
              </div>
            ))}
          </div>
          <span className="text-xs font-semibold text-slate-600">Trusted by thousands of patients</span>
        </div>

        <h1
          key={headlineIndex}
          className="motion-safe:animate-[fadeInUp_0.5s_ease-out_both] text-4xl sm:text-5xl md:text-[64px] font-extrabold tracking-[-0.035em] text-[#1E1B4B] leading-[1.05]"
          style={{ minHeight: '2.2em' }}
        >
          {line1}<br /><span className="text-indigo-600">{line2}</span>
        </h1>

        <p
          className="motion-safe:animate-[fadeInUp_0.6s_ease-out_both] text-[#4B4A6B] text-base md:text-lg max-w-xl mx-auto mt-6 leading-relaxed"
          style={{ animationDelay: '140ms' }}
        >
          Book trusted doctors, consult over live video with AI-assisted analysis, and keep every
          report and message in one secure portal — built for patients and clinics alike.
        </p>

        <div
          className="motion-safe:animate-[fadeInUp_0.6s_ease-out_both] flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
          style={{ animationDelay: '210ms' }}
        >
          <button
            onClick={() => navigate('/Userregister')}
            className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-full shadow-[0_14px_28px_-10px_rgba(79,70,229,0.6)] transition-colors duration-200 active:scale-[0.98] inline-flex items-center justify-center gap-2"
          >
            <Stethoscope size={18} /> Get Started Free
          </button>
          <button
            onClick={() => navigate('/Doctorregister')}
            className="h-14 px-8 bg-white text-[#312E81] hover:bg-[#EEEDFF] font-extrabold rounded-full shadow-[0_8px_24px_rgba(79,70,229,0.08)] transition-colors duration-200 inline-flex items-center justify-center gap-2"
          >
            Join as a Doctor <ArrowRight size={16} />
          </button>
        </div>

        <div
          className="motion-safe:animate-[fadeInUp_0.6s_ease-out_both] flex flex-wrap items-center justify-center gap-2.5 mt-10"
          style={{ animationDelay: '280ms' }}
        >
          {HERO_POINTS.map(({ icon, label, tint }) => (
            <div key={label} className={`flex items-center gap-2 h-10 px-4 rounded-full ${tint}`}>
              {icon}
              <span className="text-sm font-bold">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="motion-safe:animate-[fadeInUp_0.7s_ease-out_both] relative max-w-lg mx-auto px-6 pt-16 pb-24 md:pb-32"
        style={{ animationDelay: '350ms' }}
      >
        <div className="relative mx-auto w-64">
          <div className="rounded-[2.5rem] border-[7px] border-[#1E1B4B] bg-[#1E1B4B] shadow-[0_40px_80px_-20px_rgba(49,46,129,0.45)] overflow-hidden">
            <div className="bg-[#F6F6FD] aspect-9/19 flex flex-col">
              <div className="h-6 flex items-center justify-center shrink-0">
                <div className="w-16 h-1.5 bg-[#1E1B4B] rounded-full" />
              </div>
              <div className="flex-1 px-4 pb-4 flex flex-col gap-3">
                <p className="text-[12px] font-extrabold text-[#1E1B4B] mt-1">Hi Priya</p>

                <div className="bg-[#E9E8FF] rounded-[18px] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                      MA
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-800">Dr. Meera Anand</p>
                      <p className="text-[9px] text-slate-400">Cardiologist</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1.5 bg-white rounded-full mb-2">
                    <span className="text-[9px] font-bold text-slate-600">Today, 10:00 AM</span>
                    <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Confirmed</span>
                  </div>
                  <button className="w-full py-2 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center gap-1">
                    <Video size={11} /> Join Video Call
                  </button>
                </div>

                <div className="bg-[#FFF0E6] rounded-[18px] p-3 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'conic-gradient(#4F46E5 0% 92%, #EEEDFF 92% 100%)' }}
                  >
                    <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
                      <span className="text-[10px] font-bold text-slate-900">92</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-800">Report reviewed</p>
                    <p className="text-[9px] text-emerald-600 font-bold">Normal range</p>
                  </div>
                </div>

                <div className="bg-[#E7F7EF] rounded-[18px] p-3 flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-white text-[#05603A] flex items-center justify-center shrink-0"><Pill size={14} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-[#054F31]">Vitamin D3</p>
                    <p className="text-[9px] font-semibold text-[#05603A]">2:00 PM · taken</p>
                  </div>
                </div>

                <div className="mt-auto bg-[#FFECEB] rounded-[18px] p-3 flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-[#F04438] text-white flex items-center justify-center shrink-0"><ShieldAlert size={14} /></span>
                  <p className="text-[10px] font-bold text-[#7A271A]">SOS ready · 2 contacts</p>
                </div>
              </div>
            </div>
          </div>

          {visibleWidgets.map((w, slot) => (
            <div key={slot} className={`${WIDGET_POSITIONS[slot]} items-center gap-2.5 bg-white rounded-full shadow-[0_14px_30px_rgba(79,70,229,0.15)] pl-2 pr-4 py-2`}>
              <span key={w.label} className="motion-safe:animate-[fadeInUp_0.4s_ease-out_both] flex items-center gap-2">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center ${w.tint}`}>{w.icon}</span>
                <span className="text-xs font-bold text-[#1E1B4B] whitespace-nowrap">{w.label}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;

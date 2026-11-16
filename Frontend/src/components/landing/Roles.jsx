import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Stethoscope, ShieldCheck, Check, ArrowRight } from 'lucide-react';
import Reveal from './Reveal';

const ROLES = [
  {
    role: 'Patients', icon: Users, cta: ['Join as a patient', '/Userregister'],
    description: 'Book, consult and follow up without ever picking up the phone.',
    items: ['Find & book verified doctors', 'Video visits from home', 'Reports explained simply', 'Medicine reminders & SOS'],
    card: 'bg-[#E9E8FF]', ink: 'text-indigo-600', btn: 'bg-indigo-600 text-white hover:bg-indigo-700',
  },
  {
    role: 'Doctors', icon: Stethoscope, cta: ['Join as a doctor', '/Doctorregister'],
    description: 'Spend the day treating patients, not managing a calendar.',
    items: ['Organised appointment list', 'AI briefing before each visit', 'Video calls & secure chat', 'Your profile, seen by patients'],
    card: 'bg-[#1E1B4B] text-white', ink: 'text-[#A5B4FC]', btn: 'bg-white text-[#1E1B4B] hover:bg-[#EEEDFF]', dark: true,
  },
  {
    role: 'Admins', icon: ShieldCheck, cta: ['Admin sign in', '/login'],
    description: 'Keep the platform safe and running smoothly.',
    items: ['Verify doctor certificates', 'Approve appointment requests', 'Manage doctors & patients', 'See platform activity at a glance'],
    card: 'bg-[#FFF0E6]', ink: 'text-[#9A3412]', btn: 'bg-white text-[#7C2D12] hover:bg-[#FFF8F3]',
  },
];

const Roles = () => {
  const navigate = useNavigate();
  return (
    <section id="roles" className="px-4 sm:px-6 py-24">
      <div className="max-w-6xl mx-auto">
        <Reveal className="max-w-2xl mx-auto text-center">
          <p className="text-sm font-extrabold text-indigo-600">Built for everyone</p>
          <h2 className="mt-2 text-[34px] md:text-[48px] font-extrabold leading-[1.08] tracking-[-0.035em] text-[#1E1B4B]">One app, three happy sides</h2>
        </Reveal>
        <div className="mt-14 grid md:grid-cols-3 gap-5 items-stretch">
          {ROLES.map(({ role, icon: Icon, description, items, cta, card, ink, btn, dark }, i) => (
            <Reveal key={role} delay={i * 90} className={`relative overflow-hidden rounded-[36px] p-8 flex flex-col ${card} ${dark ? 'md:-translate-y-4 shadow-[0_30px_60px_-20px_rgba(30,27,75,0.6)]' : ''}`}>
              <div aria-hidden="true" className={`absolute -right-12 -top-12 w-40 h-40 rounded-full ${dark ? 'bg-[#312E81]' : 'bg-white/50'}`} />
              <span className={`relative w-14 h-14 rounded-full flex items-center justify-center ${dark ? 'bg-[#312E81] text-white' : 'bg-white ' + ink}`}><Icon size={24} /></span>
              <h3 className={`relative mt-6 text-2xl font-extrabold ${dark ? '' : 'text-[#1E1B4B]'}`}>For {role.toLowerCase()}</h3>
              <p className={`relative mt-2 text-[15px] ${dark ? 'text-[#C7D2FE]' : 'text-[#4B4A6B]'}`}>{description}</p>
              <ul className="relative mt-6 mb-8 flex flex-col gap-2.5">
                {items.map((it) => (
                  <li key={it} className={`flex items-center gap-3 text-[15px] font-semibold ${dark ? 'text-[#E0E7FF]' : 'text-[#1E1B4B]'}`}>
                    <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center ${dark ? 'bg-indigo-500 text-white' : 'bg-white ' + ink}`}><Check size={13} strokeWidth={3} /></span>{it}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate(cta[1])} className={`relative mt-auto h-12 rounded-full text-[15px] font-extrabold flex items-center justify-center gap-2 ${btn}`}>
                {cta[0]} <ArrowRight size={16} />
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Roles;

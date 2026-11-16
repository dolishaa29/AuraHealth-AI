import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ArrowRight, Stethoscope } from 'lucide-react';

const COLUMNS = [
  { title: 'Product', links: [['How it works', '#how-it-works'], ['Features', '#features'], ['Pricing', '#pricing']] },
  { title: 'Help', links: [['FAQ', '#faq'], ['Contact support', '#contact'], ['Health guides', '#resources']] },
];

const Footer = () => {
  const navigate = useNavigate();
  return (
    <footer className="px-3 sm:px-6 pb-6">

      <div className="relative overflow-hidden max-w-6xl mx-auto rounded-[40px] bg-indigo-600 text-white px-6 py-14 sm:px-14 sm:py-16 grid lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
        <div aria-hidden="true" className="absolute -right-16 -top-24 w-80 h-80 rounded-full bg-indigo-500" />
        <div aria-hidden="true" className="absolute right-1/3 -bottom-32 w-72 h-72 rounded-full bg-indigo-700" />
        <div className="relative">
          <h2 className="text-[34px] sm:text-[48px] font-extrabold leading-[1.05] tracking-[-0.035em]">Ready to feel looked after?</h2>
          <p className="mt-3 text-lg text-indigo-100">Create your free account and get 100 credits today.</p>
        </div>
        <div className="relative flex flex-wrap gap-3 lg:justify-end">
          <button onClick={() => navigate('/Userregister')} className="h-14 px-7 rounded-full bg-white text-[#312E81] text-base font-extrabold flex items-center gap-2 hover:bg-[#EEEDFF]">Get started free <ArrowRight size={18} /></button>
          <button onClick={() => navigate('/Doctorregister')} className="h-14 px-7 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white text-base font-extrabold flex items-center gap-2"><Stethoscope size={18} /> I'm a doctor</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-5 rounded-[36px] bg-white px-6 py-10 sm:px-12 shadow-[0_8px_30px_rgba(79,70,229,0.06)] grid sm:grid-cols-[1.4fr_1fr_1fr] gap-10">
        <div>
          <span className="flex items-center gap-2.5 font-extrabold text-xl text-[#1E1B4B]">
            <span className="w-10 h-10 rounded-[14px] bg-indigo-600 text-white flex items-center justify-center"><Heart size={19} /></span>
            AuraHealth
          </span>
          <p className="mt-4 max-w-xs text-[15px] text-[#4B4A6B]">Doctors, reports, medicine reminders and SOS, all in one gentle place.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => navigate('/login')} className="h-10 px-4 rounded-full bg-[#EEEDFF] text-[#312E81] text-sm font-bold">Sign in</button>
            <button onClick={() => navigate('/Doctorregister')} className="h-10 px-4 rounded-full bg-[#F6F6FD] text-[#4B4A6B] text-sm font-bold">Doctor portal</button>
          </div>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="text-sm font-extrabold text-[#1E1B4B]">{col.title}</p>
            <ul className="mt-4 flex flex-col gap-1">
              {col.links.map(([label, href]) => (
                <li key={href}><a href={href} className="inline-flex h-9 items-center text-[15px] font-semibold text-[#4B4A6B] hover:text-indigo-600">{label}</a></li>
              ))}
            </ul>
          </nav>
        ))}
        <p className="sm:col-span-3 pt-6 border-t border-[#EFEFF8] text-sm text-[#6B6A8A] flex flex-wrap justify-between gap-2">
          <span>© {new Date().getFullYear()} AuraHealth. All rights reserved.</span>
          <span>For guidance only. In an emergency, call 112.</span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;

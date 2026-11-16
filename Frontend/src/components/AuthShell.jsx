import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Check } from 'lucide-react';

const AuthShell = ({ panelTitle, panelText, points = [], title, subtitle, children }) => (
  <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#F6F6FD] font-sans text-[#1E1B4B]">
    <div className="w-full max-w-[1180px] flex flex-wrap gap-5 p-4 sm:p-5 rounded-[40px] bg-white shadow-[0_20px_60px_rgba(79,70,229,0.08)]">
      <section className="relative overflow-hidden flex-[1_1_400px] min-h-[260px] lg:min-h-[600px] rounded-[30px] bg-[#E9E8FF] p-8 sm:p-10 flex flex-col justify-between gap-8">
        <div aria-hidden="true" className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-[#DAD8FF]" />
        <div aria-hidden="true" className="absolute -left-16 -bottom-28 w-64 h-64 rounded-full bg-[#D2CFFF]" />
        <Link to="/" className="relative self-start flex items-center gap-2.5">
          <span className="w-[42px] h-[42px] rounded-[15px] bg-indigo-600 text-white flex items-center justify-center"><Heart size={22} /></span>
          <span className="font-extrabold text-[21px] tracking-tight">AuraHealth</span>
        </Link>
        <div className="relative">
          <h1 className="text-[34px] sm:text-[40px] font-extrabold leading-[1.1] tracking-[-0.035em]">{panelTitle}</h1>
          {panelText && <p className="mt-3.5 text-base leading-relaxed text-[#4B4A6B] max-w-[420px]">{panelText}</p>}
        </div>
        {points.length > 0 && (
          <ul className="relative hidden sm:flex flex-col gap-2.5">
            {points.map((p) => (
              <li key={p} className="self-start flex items-center gap-3 py-2.5 pl-2.5 pr-5 rounded-full bg-white shadow-[0_10px_30px_rgba(79,70,229,0.1)] text-sm font-bold">
                <span className="w-8 h-8 rounded-full bg-[#E7F7EF] text-[#05603A] flex items-center justify-center"><Check size={15} strokeWidth={3} /></span>{p}
              </li>
            ))}
          </ul>
        )}
      </section>

      <main className="flex-[1_1_420px] flex items-center justify-center px-2 py-8 sm:px-6">
        <div className="w-full max-w-[440px] flex flex-col gap-[18px]">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">{title}</h2>
            {subtitle && <p className="mt-1.5 text-[15px] text-[#6B6A8A]">{subtitle}</p>}
          </div>
          {children}
        </div>
      </main>
    </div>
  </div>
);

export default AuthShell;

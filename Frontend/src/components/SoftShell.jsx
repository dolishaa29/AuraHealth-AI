import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import { LogOut, Menu, X, Heart } from 'lucide-react';

const SoftShell = ({ nav, cookieName, badge }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const go = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#F6F6FD] font-sans text-[#1E1B4B] overflow-hidden lg:p-5 lg:gap-5">
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white flex items-center justify-between px-4 z-30 shadow-[0_4px_20px_rgba(79,70,229,0.06)]">
        <span className="flex items-center gap-2 font-extrabold text-lg tracking-tight">
          <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center"><Heart size={16} /></span>
          AuraHealth
        </span>
        <button onClick={() => setMobileOpen(true)} className="p-2.5 rounded-full text-[#4B4A6B] hover:bg-[#F6F6FD]" aria-label="Open menu">
          <Menu size={22} />
        </button>
      </div>

      {mobileOpen && <div className="lg:hidden fixed inset-0 bg-[#1E1B4B]/30 z-40" onClick={() => setMobileOpen(false)} />}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[260px] shrink-0 bg-white lg:rounded-[28px] shadow-[0_8px_30px_rgba(79,70,229,0.06)]
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 flex flex-col px-4 py-6 gap-6`}
      >
        <div className="flex items-center justify-between px-2.5">
          <span className="flex items-center gap-2.5">
            <span className="w-[38px] h-[38px] rounded-[14px] bg-indigo-600 text-white flex items-center justify-center"><Heart size={20} /></span>
            <span>
              <span className="block font-extrabold text-[19px] tracking-tight leading-tight">AuraHealth</span>
              {badge && <span className="block text-xs font-bold text-indigo-600">{badge}</span>}
            </span>
          </span>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden p-2 rounded-full text-[#6B6A8A] hover:bg-[#F6F6FD]" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
          {nav.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => go(path)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 min-h-[46px] px-4 rounded-full text-sm transition-colors
                ${active ? 'bg-indigo-600 text-white font-bold shadow-[0_8px_16px_-6px_rgba(79,70,229,0.5)]' : 'text-[#4B4A6B] font-semibold hover:bg-[#F6F6FD] hover:text-indigo-600'}`}
              >
                <Icon size={18} />
                {label}
              </button>
            );
          })}
        </nav>

        <button
          onClick={() => { Cookies.remove(cookieName); navigate('/login'); }}
          className="flex items-center gap-3 min-h-[44px] px-4 rounded-full text-sm font-semibold text-[#B42318] hover:bg-[#FFECEB]"
        >
          <LogOut size={18} /> Sign out
        </button>
      </aside>

      <main className="flex-1 min-w-0 overflow-hidden pt-16 lg:pt-0 lg:rounded-[28px]">
        <Outlet />
      </main>
    </div>
  );
};

export default SoftShell;

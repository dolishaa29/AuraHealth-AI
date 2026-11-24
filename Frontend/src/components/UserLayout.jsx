import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import axios from 'axios';
import {
  CalendarPlus, LayoutList, LogOut, Menu, X, Heart,
  Home, User, MessageCircle, FileText, ScanFace, CalendarClock, MapPin, ShieldAlert, Pill, NotebookPen,
} from 'lucide-react';
import SosButton from './SosButton';
import ReminderNotifier from './ReminderNotifier';

const NAV = [
  { path: '/Userdashboard', label: 'Home', icon: Home },
  { path: '/ViewDoctorss', label: 'Doctors', icon: CalendarPlus },
  { path: '/SlotBooking', label: 'Book a slot', icon: CalendarClock },
  { path: '/userviewapp', label: 'Appointments', icon: LayoutList },
  { path: '/reminders', label: 'Medicines', icon: Pill },
  { path: '/wellness', label: 'Meals and symptoms', icon: NotebookPen },
  { path: '/ReportAnalysis', label: 'Reports', icon: FileText },
  { path: '/LiveCapture', label: 'Skin scan', icon: ScanFace },
  { path: '/userchat', label: 'Messages', icon: MessageCircle },
  { path: '/NearbyHospitals', label: 'Hospitals', icon: MapPin },
  { path: '/emergency-contacts', label: 'Safety', icon: ShieldAlert },
  { path: '/userprofile', label: 'Profile', icon: User },
];

const UserLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [credits, setCredits] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const loadCredits = () => {
      axios
        .get(`${import.meta.env.VITE_API_URL}/credits`, {
          headers: { Authorization: `Bearer ${Cookies.get("token")}` },
          withCredentials: true,
        })
        .then((res) => setCredits(res.data.balance))
        .catch(() => {});
    };
    loadCredits();
    window.addEventListener("credits-changed", loadCredits);
    return () => window.removeEventListener("credits-changed", loadCredits);
  }, []);

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
          <span className="flex items-center gap-2.5 font-extrabold text-[19px] tracking-tight">
            <span className="w-[38px] h-[38px] rounded-[14px] bg-indigo-600 text-white flex items-center justify-center"><Heart size={20} /></span>
            AuraHealth
          </span>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden p-2 rounded-full text-[#6B6A8A] hover:bg-[#F6F6FD]" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
          {NAV.map(({ path, label, icon: Icon }) => {
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

        <div className="p-5 rounded-[22px] bg-[#EEEDFF]">
          <p className="text-[13px] font-semibold text-[#4B4A6B]">Your credits</p>
          <p className="mt-1 text-[32px] font-extrabold tracking-tight text-[#312E81] leading-tight">{credits ?? '—'}</p>
          <p className="mb-3.5 text-[13px] text-[#4B4A6B]">{credits != null ? `Enough for ${Math.floor(credits / 20)} bookings` : 'Loading…'}</p>
          <button onClick={() => go('/credits')} className="w-full h-[42px] rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold">
            Add credits
          </button>
        </div>

        <button
          onClick={() => { Cookies.remove("token"); navigate("/login"); }}
          className="flex items-center gap-3 min-h-[44px] px-4 rounded-full text-sm font-semibold text-[#B42318] hover:bg-[#FFECEB]"
        >
          <LogOut size={18} /> Sign out
        </button>
      </aside>

      <main className="flex-1 min-w-0 overflow-hidden pt-16 lg:pt-0 lg:rounded-[28px]">
        <Outlet />
      </main>

      <SosButton />
      <ReminderNotifier />
    </div>
  );
};

export default UserLayout;

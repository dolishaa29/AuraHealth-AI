import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Heart, ArrowRight } from 'lucide-react';

const NAV_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: '#contact' },
];

const Navbar = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="fixed top-0 inset-x-0 z-50 px-3 sm:px-6 pt-3">
      <nav aria-label="Main" className={`max-w-6xl mx-auto h-16 pl-4 pr-2 rounded-full flex items-center gap-3 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur shadow-[0_12px_40px_rgba(79,70,229,0.12)]' : 'bg-white/70 backdrop-blur'}`}>
        <a href="#" className="flex items-center gap-2.5 font-extrabold text-lg tracking-tight text-[#1E1B4B]">
          <span className="w-9 h-9 rounded-[13px] bg-indigo-600 text-white flex items-center justify-center"><Heart size={18} /></span>
          AuraHealth
        </a>
        <div className="hidden md:flex items-center gap-1 mx-auto">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="h-10 px-4 rounded-full flex items-center text-sm font-semibold text-[#4B4A6B] hover:bg-[#EEEDFF] hover:text-indigo-700">{l.label}</a>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-1.5">
          <button onClick={() => navigate('/login')} className="h-12 px-5 rounded-full text-sm font-bold text-[#312E81] hover:bg-[#F6F6FD]">Sign in</button>
          <button onClick={() => navigate('/Userregister')} className="group h-12 px-5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center gap-1.5">
            Get started <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
        <button onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={menuOpen} className="md:hidden ml-auto w-12 h-12 rounded-full bg-[#F6F6FD] text-[#4B4A6B] flex items-center justify-center">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {menuOpen && (
        <div className="md:hidden max-w-6xl mx-auto mt-2 p-3 rounded-[28px] bg-white shadow-[0_12px_40px_rgba(79,70,229,0.14)] flex flex-col gap-1">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="h-12 px-4 rounded-full flex items-center font-semibold text-[#4B4A6B] hover:bg-[#F6F6FD]">{l.label}</a>
          ))}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button onClick={() => navigate('/login')} className="h-12 rounded-full bg-[#EEEDFF] text-[#312E81] font-bold">Sign in</button>
            <button onClick={() => navigate('/Userregister')} className="h-12 rounded-full bg-indigo-600 text-white font-bold">Get started</button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;

import React, { useState } from 'react';
import { Plus, MessageCircle } from 'lucide-react';
import Reveal from './Reveal';

const FAQS = [
  { q: 'Is AuraHealth free to use?', a: 'Signing up is free and every new patient gets 100 credits. Medicine reminders, SOS and hospital search are always free. Doctor bookings and AI tools use credits, which never expire.' },
  { q: 'How do video visits work?', a: 'Book a slot with a verified doctor. The video call opens 10 minutes before your time, right in your browser. There is nothing to install.' },
  { q: 'Can the AI replace my doctor?', a: 'No. Report summaries, skin scans and AuraBot help you understand your health and prepare for visits. Always follow your doctor’s advice.' },
  { q: 'What happens when I press SOS?', a: 'Hold the red button for 2 seconds. WhatsApp opens with your live location for your emergency contacts, and you can call 112 from the same screen.' },
  { q: 'How do doctors join?', a: 'Doctors register and upload their certificate. Once our team verifies it, patients can find and book them.' },
  { q: 'Who can see my reports and messages?', a: 'Only you and the doctors you book with. Your doctor sees a short summary of your past reports before your visit.' },
];

const FAQ = () => {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="px-4 sm:px-6 py-24">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[0.8fr_1.2fr] gap-10 items-start">
        <Reveal className="lg:sticky lg:top-28">
          <p className="text-sm font-extrabold text-indigo-600">FAQ</p>
          <h2 className="mt-2 text-[34px] md:text-[48px] font-extrabold leading-[1.08] tracking-[-0.035em] text-[#1E1B4B]">Questions, answered kindly</h2>
          <div className="mt-8 relative overflow-hidden rounded-[32px] bg-[#E9E8FF] p-7">
            <div aria-hidden="true" className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-[#DAD8FF]" />
            <span className="relative w-12 h-12 rounded-full bg-white text-indigo-600 flex items-center justify-center"><MessageCircle size={22} /></span>
            <p className="relative mt-4 text-lg font-extrabold text-[#1E1B4B]">Still curious?</p>
            <p className="relative mt-1 text-[15px] text-[#4B4A6B]">Ask AuraBot in the corner, or write to us below.</p>
            <a href="#contact" className="relative mt-5 inline-flex h-11 px-5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold items-center">Contact us</a>
          </div>
        </Reveal>

        <div className="flex flex-col gap-3">
          {FAQS.map(({ q, a }, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={q} delay={i * 50} className={`rounded-[26px] transition-colors ${isOpen ? 'bg-white shadow-[0_12px_36px_rgba(79,70,229,0.1)]' : 'bg-white/70 hover:bg-white'}`}>
                <h3>
                  <button onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen} className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left text-[16px] font-extrabold text-[#1E1B4B]">
                    {q}
                    <span className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-indigo-600 text-white rotate-45' : 'bg-[#F6F6FD] text-[#4B4A6B]'}`}><Plus size={18} /></span>
                  </button>
                </h3>
                {isOpen && <p className="px-6 pb-6 -mt-1 text-[15px] leading-relaxed text-[#4B4A6B]">{a}</p>}
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQ;

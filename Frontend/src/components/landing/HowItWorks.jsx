import React from 'react';
import { UserPlus, CalendarSearch, Video, FileCheck2 } from 'lucide-react';
import Reveal from './Reveal';

const STEPS = [
  { icon: UserPlus, title: 'Create your account', description: 'Sign up in under a minute and get 30 free AI credits. No paperwork.', tint: 'bg-[#EEEDFF] text-indigo-600', card: 'bg-white' },
  { icon: CalendarSearch, title: 'Find & book a slot', description: 'Browse verified doctors and grab a real-time slot that fits your day.', tint: 'bg-white text-[#9A3412]', card: 'bg-[#FFF0E6]' },
  { icon: Video, title: 'Meet by video', description: 'See your doctor face to face from home. The call opens 10 minutes before your slot.', tint: 'bg-white text-[#1E40AF]', card: 'bg-[#E6F1FF]' },
  { icon: FileCheck2, title: 'Follow up with ease', description: 'Reports, messages and medicine reminders stay together, ready whenever you need them.', tint: 'bg-white text-[#05603A]', card: 'bg-[#E7F7EF]' },
];

const HowItWorks = () => (
  <section id="how-it-works" className="px-4 sm:px-6 py-24">
    <div className="max-w-6xl mx-auto">
      <Reveal className="max-w-2xl mx-auto text-center">
        <p className="text-sm font-extrabold text-indigo-600">How it works</p>
        <h2 className="mt-2 text-[34px] md:text-[48px] font-extrabold leading-[1.08] tracking-[-0.035em] text-[#1E1B4B]">Four simple steps to feeling better</h2>
        <p className="mt-4 text-lg text-[#4B4A6B]">No queues, no phone calls, no lost papers.</p>
      </Reveal>

      <div className="relative mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div aria-hidden="true" className="hidden lg:block absolute top-[52px] left-[12%] right-[12%] border-t-2 border-dashed border-[#C4C1F5]" />
        {STEPS.map(({ icon: Icon, title, description, tint, card }, i) => (
          <Reveal key={title} delay={i * 90} className={`relative rounded-[32px] p-7 ${card} ${card === 'bg-white' ? 'shadow-[0_8px_30px_rgba(79,70,229,0.08)]' : ''}`}>
            <div className="flex items-center justify-between">
              <span className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-[0_6px_16px_rgba(79,70,229,0.1)] ${tint}`}><Icon size={24} /></span>
              <span className="text-5xl font-extrabold text-[#1E1B4B]/10">0{i + 1}</span>
            </div>
            <h3 className="mt-6 text-xl font-extrabold text-[#1E1B4B]">{title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-[#4B4A6B]">{description}</p>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;

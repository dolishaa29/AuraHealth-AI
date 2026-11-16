import React from 'react';
import { Video, Check, CalendarCheck, FileText, MessageCircle } from 'lucide-react';
import Reveal from './Reveal';

const SHOWCASE = [
  {
    eyebrow: 'Booking', icon: CalendarCheck,
    title: 'Slots that fill themselves',
    description: 'See real doctor availability and book in seconds. No double-booking, no phone tag, no waiting rooms.',
    bullets: ['Real-time availability', 'Instant confirmation', 'AI suggests the right specialist'],
    variant: 'booking', panel: 'bg-[#E9E8FF]', blob: 'bg-[#DAD8FF]', ink: 'text-indigo-600',
  },
  {
    eyebrow: 'Reports', icon: FileText,
    title: 'Reports in words you understand',
    description: 'Upload a lab report and get a plain-language summary, with anything unusual gently pointed out.',
    bullets: ['Plain-language summary', 'Unusual values highlighted', 'Your doctor sees it before the call'],
    variant: 'reports', panel: 'bg-[#FFF0E6]', blob: 'bg-[#FFE0CC]', ink: 'text-[#9A3412]',
  },
  {
    eyebrow: 'Video visits', icon: Video,
    title: 'See your doctor from home',
    description: 'Join a face-to-face video call right in your browser. It opens 10 minutes before your slot.',
    bullets: ['One-tap video call', 'No app to install', 'Works on phone or laptop'],
    variant: 'video', panel: 'bg-[#E6F1FF]', blob: 'bg-[#D3E6FF]', ink: 'text-[#1E40AF]',
  },
  {
    eyebrow: 'Messaging', icon: MessageCircle,
    title: 'One thread, not five apps',
    description: 'Every message between you and your doctor stays in one place, before and after the appointment.',
    bullets: ['Real-time chat', 'Linked to your visits', 'Works on any device'],
    variant: 'messaging', panel: 'bg-[#E7F7EF]', blob: 'bg-[#D1F2E1]', ink: 'text-[#05603A]',
  },
];

const BookingMock = () => (
  <div className="w-full flex flex-col gap-2.5">
    <p className="text-sm font-extrabold text-[#1E1B4B]">Dr. Meera Anand · Tomorrow</p>
    <div className="grid grid-cols-2 gap-2">
      {['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM'].map((slot, i) => (
        <span key={slot} className={`h-11 rounded-full flex items-center justify-center gap-1.5 text-sm font-bold ${i === 2 ? 'bg-indigo-600 text-white' : i === 0 ? 'bg-[#EFEFF8] text-[#9A99B5] line-through' : 'bg-[#F6F6FD] text-[#1E1B4B]'}`}>
          {slot}{i === 2 && <Check size={14} strokeWidth={3} />}
        </span>
      ))}
    </div>
    <span className="mt-1 h-11 rounded-full bg-[#E7F7EF] text-[#05603A] text-sm font-bold flex items-center justify-center gap-1.5"><Check size={15} strokeWidth={3} /> Booked for 10:00 AM</span>
  </div>
);

const ReportsMock = () => (
  <div className="w-full flex flex-col gap-2.5">
    <p className="text-sm font-extrabold text-[#1E1B4B]">Complete blood count</p>
    <p className="px-4 py-3 rounded-[18px] bg-[#EEEDFF] text-[13px] leading-relaxed text-[#312E81]">Most values look healthy. Haemoglobin is a little low, which can cause tiredness.</p>
    <div className="flex justify-between px-4 py-2.5 rounded-full bg-[#FFF4E5] text-[13px] font-bold"><span>Haemoglobin</span><span className="text-[#B45309]">slightly low</span></div>
    <div className="flex justify-between px-4 py-2.5 rounded-full bg-[#E7F7EF] text-[13px] font-bold"><span>Platelets</span><span className="text-[#05603A]">normal</span></div>
  </div>
);

const VideoMock = () => (
  <div className="w-full">
    <div className="relative rounded-[22px] bg-[#1E1B4B] aspect-video flex items-center justify-center">
      <span className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#B42318] text-[11px] font-extrabold"><span className="w-1.5 h-1.5 rounded-full bg-[#F04438] animate-pulse" /> LIVE</span>
      <span className="w-16 h-16 rounded-full bg-white text-indigo-600 text-lg font-extrabold flex items-center justify-center">MA</span>
      <span className="absolute bottom-3 right-3 w-14 h-10 rounded-[12px] bg-[#312E81] text-[#C7D2FE] text-[10px] font-bold flex items-center justify-center">You</span>
    </div>
    <div className="mt-3 flex justify-center gap-2">
      <span className="w-10 h-10 rounded-full bg-[#F6F6FD]" /><span className="w-10 h-10 rounded-full bg-[#F6F6FD]" /><span className="w-10 h-10 rounded-full bg-[#F04438]" />
    </div>
  </div>
);

const MessagingMock = () => (
  <div className="w-full flex flex-col gap-2.5">
    <div className="max-w-[80%] px-4 py-3 rounded-[20px] rounded-bl-md bg-[#F6F6FD] text-[13px] font-semibold text-[#4B4A6B]">How are you feeling after the last dose?</div>
    <div className="max-w-[80%] ml-auto px-4 py-3 rounded-[20px] rounded-br-md bg-indigo-600 text-[13px] font-semibold text-white">Much better, thank you!</div>
    <div className="max-w-[80%] px-4 py-3 rounded-[20px] rounded-bl-md bg-[#F6F6FD] text-[13px] font-semibold text-[#4B4A6B]">Great. Keep going for 5 more days.</div>
  </div>
);

const MOCKS = { booking: BookingMock, reports: ReportsMock, video: VideoMock, messaging: MessagingMock };

const FeatureShowcase = () => (
  <section id="features" className="px-4 sm:px-6 py-24">
    <div className="max-w-6xl mx-auto">
      <Reveal className="max-w-2xl mx-auto text-center">
        <p className="text-sm font-extrabold text-indigo-600">Features</p>
        <h2 className="mt-2 text-[34px] md:text-[48px] font-extrabold leading-[1.08] tracking-[-0.035em] text-[#1E1B4B]">Everything your health needs, in one calm app</h2>
      </Reveal>

      <div className="mt-14 flex flex-col gap-6">
        {SHOWCASE.map((f, i) => {
          const Mock = MOCKS[f.variant];
          const Icon = f.icon;
          return (
            <Reveal key={f.title} className={`relative overflow-hidden rounded-[40px] ${f.panel} p-7 sm:p-12 grid md:grid-cols-2 gap-10 items-center`}>
              <div aria-hidden="true" className={`absolute ${i % 2 ? '-left-20' : '-right-20'} -top-24 w-80 h-80 rounded-full ${f.blob}`} />
              <div className={`relative ${i % 2 === 1 ? 'md:order-2' : ''}`}>
                <span className={`inline-flex items-center gap-2 h-9 px-4 rounded-full bg-white text-[13px] font-extrabold ${f.ink}`}><Icon size={15} /> {f.eyebrow}</span>
                <h3 className="mt-5 text-[28px] md:text-[36px] font-extrabold leading-[1.1] tracking-[-0.03em] text-[#1E1B4B]">{f.title}</h3>
                <p className="mt-4 text-[16px] leading-relaxed text-[#4B4A6B]">{f.description}</p>
                <ul className="mt-6 flex flex-col gap-2.5">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-3 text-[15px] font-bold text-[#1E1B4B]">
                      <span className={`w-7 h-7 shrink-0 rounded-full bg-white flex items-center justify-center ${f.ink}`}><Check size={14} strokeWidth={3} /></span>{b}
                    </li>
                  ))}
                </ul>
              </div>
              <div aria-hidden="true" className="relative">
                <div className="mx-auto max-w-sm rounded-[28px] bg-white p-6 shadow-[0_24px_50px_-12px_rgba(49,46,129,0.25)] hover:-translate-y-1.5 transition-transform duration-300">
                  <Mock />
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  </section>
);

export default FeatureShowcase;

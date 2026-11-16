import React from 'react';
import { HeartPulse, Brain, Salad, Clock } from 'lucide-react';
import Reveal from './Reveal';

const ARTICLES = [
  { icon: HeartPulse, tag: 'Heart health', title: 'Reading your first cardiology report without the jargon', readTime: '5 min read', card: 'bg-[#FFECEB]', ink: 'text-[#B42318]' },
  { icon: Brain, tag: 'Mental health', title: 'What a good telehealth therapy session looks like', readTime: '4 min read', card: 'bg-[#E9E8FF]', ink: 'text-indigo-600' },
  { icon: Salad, tag: 'Nutrition', title: 'Diet changes your doctor is most likely to recommend', readTime: '6 min read', card: 'bg-[#E7F7EF]', ink: 'text-[#05603A]' },
];

const Resources = () => (
  <section id="resources" className="px-4 sm:px-6 py-24">
    <div className="max-w-6xl mx-auto">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-sm font-extrabold text-indigo-600">Health guides</p>
          <h2 className="mt-2 text-[34px] md:text-[48px] font-extrabold leading-[1.08] tracking-[-0.035em] text-[#1E1B4B]">Learn a little, worry a lot less</h2>
        </div>
        <span className="h-10 px-4 rounded-full bg-white text-sm font-bold text-[#4B4A6B] flex items-center shadow-[0_8px_24px_rgba(79,70,229,0.08)]">Guides coming soon</span>
      </Reveal>
      <div className="mt-12 grid md:grid-cols-3 gap-5">
        {ARTICLES.map(({ icon: Icon, tag, title, readTime, card, ink }, i) => (
          <Reveal key={title} delay={i * 90} className={`relative overflow-hidden rounded-[32px] p-7 ${card}`}>
            <div aria-hidden="true" className="absolute -right-10 -bottom-10 w-36 h-36 rounded-full bg-white/50" />
            <div className="relative flex items-center justify-between">
              <span className={`h-9 px-3.5 rounded-full bg-white flex items-center gap-2 text-[13px] font-extrabold ${ink}`}><Icon size={15} /> {tag}</span>
              <span className="text-xs font-bold text-[#4B4A6B] flex items-center gap-1"><Clock size={12} /> {readTime}</span>
            </div>
            <h3 className="relative mt-10 text-xl font-extrabold leading-snug text-[#1E1B4B]">{title}</h3>
            <p className={`relative mt-4 text-sm font-bold ${ink}`}>Coming soon</p>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

export default Resources;

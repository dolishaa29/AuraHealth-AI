import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles } from 'lucide-react';

const PACKS = [
  { name: 'Starter', credits: 100, price: 10, card: 'bg-[#E7F7EF]', name_: 'text-[#05603A]', big: 'text-[#054F31]', btn: 'bg-white text-[#054F31]' },
  { name: 'Plus', credits: 300, price: 249, tag: 'Most loved', card: 'bg-white shadow-[0_0_0_2px_#4F46E5,0_20px_40px_rgba(79,70,229,0.15)]', name_: 'text-[#3730A3]', big: 'text-[#312E81]', btn: 'bg-indigo-600 text-white hover:bg-indigo-700' },
  { name: 'Pro', credits: 1000, price: 699, card: 'bg-[#FFF0E6]', name_: 'text-[#9A3412]', big: 'text-[#7C2D12]', btn: 'bg-white text-[#7C2D12]' },
];

const COSTS = [
  ['Book a doctor', '20'],
  ['Explain a lab report', '10'],
  ['Live skin scan, 10 min', '5'],
  ['AuraBot message', '1'],
  ['Reminders, SOS, hospitals', 'Free'],
];

const Pricing = () => {
  const navigate = useNavigate();
  return (
    <section id="pricing" className="px-3 sm:px-6 py-20">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl">
          <p className="text-sm font-extrabold text-indigo-600">Simple pricing</p>
          <h2 className="mt-2 text-[32px] sm:text-[40px] font-extrabold tracking-[-0.03em] text-[#1E1B4B]">Pay only for what you use.</h2>
          <p className="mt-3 text-[17px] text-[#4B4A6B]">No subscription. Top up credits when you need them; they never expire.</p>
        </div>

        <div className="mt-10 grid lg:grid-cols-[1fr_1.4fr] gap-5 items-start">

          <div className="relative overflow-hidden rounded-[32px] bg-indigo-600 text-white p-8">
            <div aria-hidden="true" className="absolute -right-14 -top-16 w-56 h-56 rounded-full bg-indigo-500" />
            <span className="relative inline-flex items-center gap-2 h-9 px-4 rounded-full bg-white text-indigo-600 text-[13px] font-bold"><Sparkles size={14} /> Welcome gift</span>
            <p className="relative mt-5 text-6xl font-extrabold tracking-[-0.04em]">100</p>
            <p className="relative text-lg font-bold text-indigo-100">free credits when you sign up</p>
            <div className="relative mt-6 flex flex-col gap-2">
              {COSTS.map(([label, cost]) => (
                <div key={label} className="flex justify-between items-center px-4 py-2.5 rounded-[16px] bg-indigo-500/60 text-sm">
                  <span className="font-semibold">{label}</span><span className="font-extrabold">{cost}</span>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/Userregister')} className="relative mt-6 w-full h-14 rounded-full bg-white text-[#312E81] text-base font-extrabold hover:bg-[#F6F6FD]">Claim your free credits</button>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {PACKS.map((p) => (
              <div key={p.name} className={`relative rounded-[28px] p-6 flex flex-col gap-1.5 ${p.card}`}>
                {p.tag && <span className="self-start mb-1 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-extrabold">{p.tag}</span>}
                <p className={`text-sm font-extrabold ${p.name_}`}>{p.name}</p>
                <p className={`text-[40px] font-extrabold tracking-[-0.03em] ${p.big}`}>{p.credits}</p>
                <p className={`text-[13px] ${p.name_}`}>credits</p>
                <p className={`mt-3 text-2xl font-extrabold ${p.big}`}>₹{p.price}</p>
                <p className={`text-xs ${p.name_}`}>₹{(p.price / p.credits).toFixed(2)} per credit</p>
                <button onClick={() => navigate('/Userregister')} className={`mt-4 h-12 rounded-full text-[15px] font-extrabold ${p.btn}`}>Choose {p.name}</button>
              </div>
            ))}
            <ul className="sm:col-span-3 mt-1 grid sm:grid-cols-3 gap-2 text-sm font-semibold text-[#4B4A6B]">
              {['Pay with UPI, cards or netbanking', 'Credits never expire', 'Auto refund if something fails'].map((t) => (
                <li key={t} className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-[#E7F7EF] text-[#05603A] flex items-center justify-center"><Check size={13} strokeWidth={3} /></span>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;

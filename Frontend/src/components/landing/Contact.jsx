import React, { useState } from 'react';
import { Mail, MessageCircle, Globe, Send } from 'lucide-react';
import Reveal from './Reveal';

const SUPPORT_EMAIL = 'support@aurahealth.app';

const CHANNELS = [
  { icon: Mail, title: 'Email us', detail: SUPPORT_EMAIL, description: 'Account, credits or general questions.', tint: 'bg-[#E9E8FF] text-indigo-600' },
  { icon: MessageCircle, title: 'In-app chat', detail: 'From your dashboard', description: 'Patients and doctors can message from inside the app.', tint: 'bg-[#E7F7EF] text-[#05603A]' },
  { icon: Globe, title: 'Remote-first team', detail: 'Wherever you are', description: 'We work with patients and doctors across India.', tint: 'bg-[#FFF0E6] text-[#9A3412]' },
];

const inputCls = 'w-full h-[52px] px-5 rounded-full bg-[#F6F6FD] border-2 border-transparent text-[15px] font-medium text-[#1E1B4B] placeholder:text-[#9A99B5] focus:outline-none focus:border-indigo-300 focus:bg-white';

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Message from ${form.name}`);
    const body = encodeURIComponent(`${form.message}\n\n${form.name}\n${form.email}`);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <section id="contact" className="px-4 sm:px-6 py-24">
      <div className="max-w-6xl mx-auto">
        <Reveal className="max-w-2xl mx-auto text-center">
          <p className="text-sm font-extrabold text-indigo-600">Get in touch</p>
          <h2 className="mt-2 text-[34px] md:text-[48px] font-extrabold leading-[1.08] tracking-[-0.035em] text-[#1E1B4B]">We’d love to hear from you</h2>
        </Reveal>

        <div className="mt-14 grid lg:grid-cols-[0.9fr_1.1fr] gap-5 items-start">
          <div className="flex flex-col gap-4">
            {CHANNELS.map(({ icon: Icon, title, detail, description, tint }, i) => (
              <Reveal key={title} delay={i * 80} className="flex items-start gap-4 p-6 rounded-[28px] bg-white shadow-[0_8px_30px_rgba(79,70,229,0.08)]">
                <span className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center ${tint}`}><Icon size={22} /></span>
                <div className="min-w-0">
                  <p className="text-[16px] font-extrabold text-[#1E1B4B]">{title}</p>
                  <p className="text-sm font-bold text-indigo-600 break-all">{detail}</p>
                  <p className="mt-1 text-sm text-[#4B4A6B]">{description}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="relative overflow-hidden rounded-[36px] bg-[#E9E8FF] p-7 sm:p-9">
            <div aria-hidden="true" className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-[#DAD8FF]" />
            <form onSubmit={handleSubmit} className="relative flex flex-col gap-4">
              <p className="text-2xl font-extrabold text-[#1E1B4B]">Send us a message</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-sm font-bold text-[#312E81]">Name<input name="name" required value={form.name} onChange={handleChange} placeholder="Your name" className={inputCls.replace('bg-[#F6F6FD]', 'bg-white')} /></label>
                <label className="flex flex-col gap-1.5 text-sm font-bold text-[#312E81]">Email<input name="email" type="email" required value={form.email} onChange={handleChange} placeholder="you@example.com" className={inputCls.replace('bg-[#F6F6FD]', 'bg-white')} /></label>
              </div>
              <label className="flex flex-col gap-1.5 text-sm font-bold text-[#312E81]">Message
                <textarea name="message" required rows={5} value={form.message} onChange={handleChange} placeholder="How can we help?"
                  className="w-full px-5 py-4 rounded-[24px] bg-white border-2 border-transparent text-[15px] font-medium text-[#1E1B4B] placeholder:text-[#9A99B5] focus:outline-none focus:border-indigo-300 resize-none" />
              </label>
              <button type="submit" className="h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-base font-extrabold flex items-center justify-center gap-2 shadow-[0_14px_28px_-10px_rgba(79,70,229,0.6)]">
                <Send size={17} /> Send message
              </button>
              <p className="text-center text-xs text-[#4B4A6B]">Opens your email app with the message ready to send.</p>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default Contact;

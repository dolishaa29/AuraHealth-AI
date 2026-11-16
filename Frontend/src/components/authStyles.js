export const authInput =
  "w-full h-[54px] px-5 rounded-full bg-[#F6F6FD] border-2 border-transparent text-[15px] font-medium text-[#1E1B4B] placeholder:text-[#9A99B5] focus:outline-none focus:border-indigo-300 focus:bg-white transition-all";

export const authLabel = "flex flex-col gap-2 text-sm font-bold";

export const authButton =
  "h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-base font-extrabold shadow-[0_12px_24px_-8px_rgba(79,70,229,0.55)] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2";

export const authMessage = (text) =>
  `px-4 py-3 rounded-2xl text-sm font-semibold ${/success|sent|verified|redirect/i.test(text) ? "bg-[#E7F7EF] text-[#05603A]" : "bg-[#FFECEB] text-[#B42318]"}`;


import React, { useEffect } from "react";
import { AVATAR_TINTS } from "./adminStyles";
import { Search, X, CheckCircle, XCircle, AlertTriangle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

export const PageHeader = ({ title, subtitle, children }) => (
  <div className="flex flex-wrap items-end gap-4">
    <div className="flex-[1_1_300px]">
      <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-[-0.025em]">{title}</h1>
      {subtitle && <p className="mt-1.5 text-[15px] text-[#6B6A8A]">{subtitle}</p>}
    </div>
    {children}
  </div>
);

export const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  const ok = type === "success";
  const Icon = ok ? CheckCircle : XCircle;
  return (
    <div role="status" className={`fixed top-6 right-6 z-[200] flex items-center gap-2.5 px-5 h-12 rounded-full shadow-[0_12px_30px_rgba(79,70,229,0.15)] text-sm font-bold ${ok ? "bg-[#E7F7EF] text-[#05603A]" : "bg-[#FFECEB] text-[#B42318]"}`}>
      <Icon size={16} /> {message}
    </div>
  );
};

export const ConfirmModal = ({ title, message, confirmLabel = "Confirm", danger = true, loading, onConfirm, onCancel, children }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-[#1E1B4B]/40" onClick={onCancel}>
    <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-white rounded-[32px] p-7 text-center">
      <span className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center ${danger ? "bg-[#FFECEB] text-[#D92D20]" : "bg-[#EEEDFF] text-indigo-600"}`}>
        <AlertTriangle size={24} />
      </span>
      <h3 className="mt-4 text-xl font-extrabold">{title}</h3>
      {message && <p className="mt-1.5 text-sm text-[#6B6A8A]">{message}</p>}
      {children}
      <div className="mt-6 flex gap-2.5">
        <button onClick={onCancel} disabled={loading} className="flex-1 h-12 rounded-full bg-[#F6F6FD] text-[#4B4A6B] font-bold disabled:opacity-50">Cancel</button>
        <button onClick={onConfirm} disabled={loading} className={`flex-1 h-12 rounded-full text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 ${danger ? "bg-[#F04438] hover:bg-[#D92D20]" : "bg-indigo-600 hover:bg-indigo-700"}`}>
          {loading && <Loader2 size={15} className="animate-spin" />} {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export const Avatar = ({ name, image, index = 0, size = "w-12 h-12" }) => {
  const initials = name ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() : "?";
  return image
    ? <img src={image} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
    : <span className={`${size} shrink-0 rounded-full flex items-center justify-center text-sm font-extrabold ${AVATAR_TINTS[index % AVATAR_TINTS.length]}`}>{initials}</span>;
};

export const Tabs = ({ tabs, value, onChange, label }) => (
  <div role="tablist" aria-label={label} className="self-start inline-flex flex-wrap gap-1 p-1.5 rounded-full bg-white shadow-[0_8px_30px_rgba(79,70,229,0.06)]">
    {tabs.map(({ id, label: text, count }) => (
      <button key={id} role="tab" aria-selected={value === id} onClick={() => onChange(id)}
        className={`h-10 px-5 rounded-full text-sm font-bold flex items-center gap-2 capitalize ${value === id ? "bg-indigo-600 text-white" : "text-[#4B4A6B] hover:text-indigo-600"}`}>
        {text}
        {count != null && <span className={`min-w-6 h-6 px-1.5 rounded-full text-xs font-extrabold flex items-center justify-center ${value === id ? "bg-white/20" : "bg-[#F6F6FD]"}`}>{count}</span>}
      </button>
    ))}
  </div>
);

export const SearchPill = ({ value, onChange, placeholder }) => (
  <label className="flex items-center gap-3 h-12 px-5 rounded-full bg-white text-[#6B6A8A] shadow-[0_8px_30px_rgba(79,70,229,0.06)] focus-within:ring-2 focus-within:ring-indigo-200 w-full sm:w-80">
    <Search size={18} />
    <span className="sr-only">Search</span>
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="flex-1 min-w-0 bg-transparent text-sm text-[#1E1B4B] placeholder:text-[#9A99B5] focus:outline-none" />
    {value && <button onClick={() => onChange("")} aria-label="Clear search" className="w-7 h-7 rounded-full hover:bg-[#F6F6FD] flex items-center justify-center"><X size={14} /></button>}
  </label>
);

export const Pagination = ({ page, totalPages, onChange, start, end, total }) => {
  if (!total) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <p className="text-sm text-[#6B6A8A]">Showing <strong className="text-[#1E1B4B]">{start}–{end}</strong> of <strong className="text-[#1E1B4B]">{total}</strong></p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="Previous page" className="w-10 h-10 rounded-full bg-white flex items-center justify-center disabled:opacity-40"><ChevronLeft size={16} /></button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => onChange(p)} aria-current={p === page ? "page" : undefined}
              className={`w-10 h-10 rounded-full text-sm font-bold ${p === page ? "bg-indigo-600 text-white" : "bg-white text-[#4B4A6B] hover:text-indigo-600"}`}>{p}</button>
          ))}
          <button onClick={() => onChange(page + 1)} disabled={page === totalPages} aria-label="Next page" className="w-10 h-10 rounded-full bg-white flex items-center justify-center disabled:opacity-40"><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
};

export const EmptyState = ({ icon: Icon, text, onClear }) => (
  <div className="py-16 flex flex-col items-center gap-3 text-center">
    <span className="w-16 h-16 rounded-full bg-white text-[#9A99B5] flex items-center justify-center shadow-[0_8px_30px_rgba(79,70,229,0.06)]"><Icon size={26} /></span>
    <p className="text-base font-extrabold">{text}</p>
    {onClear && <button onClick={onClear} className="h-10 px-5 rounded-full bg-[#EEEDFF] text-[#3730A3] text-sm font-bold">Clear search</button>}
  </div>
);

export const RowSkeleton = () => <div className="h-[84px] rounded-[24px] bg-white animate-pulse" />;

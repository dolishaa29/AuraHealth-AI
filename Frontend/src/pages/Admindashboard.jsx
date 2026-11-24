import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus, Stethoscope, AlertCircle, RefreshCw, CalendarCheck, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import DashboardAnalytics from "../components/DashboardAnalytics";
import { AdminPayouts } from "../components/DoctorPayouts";

const TILES = [
  { key: "pendingRequests", label: "doctor requests waiting", icon: UserPlus, bg: "bg-[#FFF4E5]", fg: "text-[#B45309]", path: "/Doctorrequest" },
  { key: "totalDoctors", label: "doctors on AuraHealth", icon: Stethoscope, bg: "bg-[#EEEDFF]", fg: "text-[#3730A3]", path: "/Viewdoctor" },
  { key: "totalUsers", label: "patients signed up", icon: Users, bg: "bg-[#E6F1FF]", fg: "text-[#1E40AF]", path: "/Viewusers" },
];
const BAR_COLORS = { Pending: "#F59E0B", Approved: "#12B76A", Rejected: "#F04438" };

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-4 py-2.5 rounded-full bg-white shadow-[0_8px_30px_rgba(79,70,229,0.12)] text-sm font-bold">
      {payload[0].payload.label}: <span className="text-indigo-600">{payload[0].value}</span>
    </div>
  );
};

const Admindashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(import.meta.env.VITE_API_URL + "/admindashboard", {
        headers: { Authorization: `Bearer ${Cookies.get("emtoken")}` },
        withCredentials: true,
      });
      setData(res.data.dashboard);
    } catch {
      setError("Couldn't load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const chart = data?.appointmentChart ?? [];
  const totalAppointments = chart.reduce((sum, c) => sum + (c.value || 0), 0);
  const pendingAppointments = chart.find((c) => c.label === "Pending")?.value || 0;
  const pendingDoctors = data?.pendingRequests || 0;

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-2 lg:py-2">
      <div className="flex flex-col gap-[22px] pb-16">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-[-0.025em]">Hello, Admin</h1>
          {data?.email && <p className="mt-1.5 text-[15px] text-[#6B6A8A]">{data.email}</p>}
        </div>

        {error && (
          <div className="flex items-center justify-between gap-4 px-5 py-3 rounded-[20px] bg-[#FFECEB] text-[#B42318] text-sm font-semibold">
            <span className="flex items-center gap-2"><AlertCircle size={16} /> {error}</span>
            <button onClick={fetchDashboard} className="flex items-center gap-1.5 font-bold"><RefreshCw size={14} /> Retry</button>
          </div>
        )}

        <section className="relative overflow-hidden rounded-[32px] bg-[#E9E8FF] p-6 sm:p-8 flex flex-wrap items-center gap-6">
          <div aria-hidden="true" className="absolute -right-14 -top-20 w-72 h-72 rounded-full bg-[#DAD8FF]" />
          <div aria-hidden="true" className="absolute right-28 -bottom-24 w-52 h-52 rounded-full bg-[#D2CFFF]" />
          <div className="relative flex-[1_1_340px]">
            <span className="inline-flex px-3.5 py-1.5 rounded-full bg-white text-indigo-600 text-[13px] font-bold">Needs your attention</span>
            <h2 className="mt-4 mb-1.5 text-2xl sm:text-[28px] font-extrabold tracking-tight">
              {loading ? "Checking…" : pendingDoctors + pendingAppointments === 0 ? "You're all caught up" : `${pendingDoctors} doctor${pendingDoctors === 1 ? "" : "s"} and ${pendingAppointments} appointment${pendingAppointments === 1 ? "" : "s"} to review`}
            </h2>
            <p className="mb-5 text-[15px] text-[#4B4A6B]">Approve new doctors so patients can book them, and confirm appointment requests.</p>
            <div className="flex flex-wrap gap-2.5">
              <button onClick={() => navigate("/Doctorrequest")} className="h-12 px-6 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-[15px] font-bold shadow-[0_10px_20px_-6px_rgba(79,70,229,0.5)]">Review doctors</button>
              <button onClick={() => navigate("/ViewAppointment")} className="h-12 px-[22px] rounded-full bg-white text-[#312E81] text-[15px] font-bold">Review appointments</button>
            </div>
          </div>
          <div className="relative hidden sm:flex w-[132px] h-[132px] rounded-full bg-white text-indigo-600 flex-col items-center justify-center shadow-[0_16px_40px_rgba(79,70,229,0.18)]">
            <span className="text-[40px] font-extrabold leading-none">{loading ? "…" : pendingDoctors + pendingAppointments}</span>
            <span className="text-xs font-bold text-[#6B6A8A]">pending</span>
          </div>
        </section>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          {TILES.map(({ key, label, icon: Icon, bg, fg, path }) => (
            <button key={key} onClick={() => navigate(path)} className={`flex flex-col gap-3.5 p-[22px] rounded-[26px] text-left ${bg} ${fg} hover:-translate-y-0.5 transition-transform`}>
              <span className="w-11 h-11 rounded-full bg-white flex items-center justify-center"><Icon size={20} /></span>
              <span>
                <span className="block text-[28px] font-extrabold leading-tight">{loading ? "—" : data?.[key] ?? 0}</span>
                <span className="text-sm font-semibold">{label}</span>
              </span>
            </button>
          ))}
          <button onClick={() => navigate("/ViewAppointment")} className="flex flex-col gap-3.5 p-[22px] rounded-[26px] text-left bg-[#E7F7EF] text-[#05603A] hover:-translate-y-0.5 transition-transform">
            <span className="w-11 h-11 rounded-full bg-white flex items-center justify-center"><CalendarCheck size={20} /></span>
            <span>
              <span className="block text-[28px] font-extrabold leading-tight">{loading ? "—" : totalAppointments}</span>
              <span className="text-sm font-semibold">appointment requests</span>
            </span>
          </button>
        </div>

        <DashboardAnalytics role="admin" />
        <AdminPayouts />

        <div className="flex flex-wrap gap-5 items-start">
          <section className="flex-[999_1_460px] min-w-0 bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgba(79,70,229,0.06)]">
            <h2 className="text-xl font-extrabold">Appointment requests</h2>
            <p className="mt-1 mb-5 text-sm text-[#6B6A8A]">How requests have been handled so far</p>
            <div className="h-[280px]">
              {loading ? (
                <div className="w-full h-full rounded-[20px] bg-[#F6F6FD] animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} barSize={64}>
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: 700, fill: "#6B6A8A" }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#8F8EAB" }} width={28} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "#F6F6FD", radius: 16 }} />
                    <Bar dataKey="value" radius={[16, 16, 16, 16]}>
                      {chart.map((entry) => <Cell key={entry.label} fill={BAR_COLORS[entry.label] ?? "#818CF8"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {Object.entries(BAR_COLORS).map(([label, color]) => (
                <span key={label} className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F6F6FD] text-[13px] font-bold">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />{label}
                </span>
              ))}
            </div>
          </section>

          <section className="flex-[1_1_300px] min-w-0 bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgba(79,70,229,0.06)] flex flex-col gap-2.5">
            <h2 className="mb-1 text-lg font-extrabold">Shortcuts</h2>
            {[
              ["Doctor requests", "/Doctorrequest", "bg-[#FFF4E5] text-[#B45309]", UserPlus],
              ["All doctors", "/Viewdoctor", "bg-[#EEEDFF] text-[#3730A3]", Stethoscope],
              ["All patients", "/Viewusers", "bg-[#E6F1FF] text-[#1E40AF]", Users],
              ["Appointments", "/ViewAppointment", "bg-[#E7F7EF] text-[#05603A]", CalendarCheck],
            ].map(([label, path, tint, Icon]) => (
              <button key={path} onClick={() => navigate(path)} className="flex items-center gap-3 p-3 rounded-[20px] bg-[#F6F6FD] hover:bg-[#EEEDFF] text-left">
                <span className={`w-10 h-10 rounded-full flex items-center justify-center ${tint}`}><Icon size={18} /></span>
                <span className="flex-1 text-sm font-bold">{label}</span>
                <ChevronRight size={18} className="text-[#C9C8E0]" />
              </button>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Admindashboard;

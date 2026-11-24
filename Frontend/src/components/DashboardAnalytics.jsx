import { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { Download, RefreshCw } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const API = import.meta.env.VITE_API_URL;
const integer = new Intl.NumberFormat("en-IN");
const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const format = (key, value) => {
  if (value == null) return "—";
  if (key === "amount") return rupees.format(value / 100);
  if (key === "rating") return value.toFixed(1);
  return integer.format(value);
};
const shortDate = (date) => new Date(`${date}T00:00:00Z`)
  .toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short" });

const views = {
  doctor: {
    title: "Practice analytics",
    cookie: "emstoken",
    tiles: [
      ["bookings", "Scheduled visits"], ["patients", "Unique patients"], ["repeatPatients", "Patients with repeat visits"],
      ["rating", "Average rating out of 5"], ["reviews", "Ratings received"], ["nextWeek", "Bookings in the next 7 days"],
    ],
    metrics: [["bookings", "Scheduled visits"], ["reviews", "Ratings received"], ["rating", "Average rating"]],
    caption: "Visits are counted by appointment date. Ratings use the date they were submitted.",
  },
  admin: {
    title: "Platform analytics",
    cookie: "emtoken",
    tiles: [
      ["bookings", "Scheduled visits"], ["nextWeek", "Bookings in the next 7 days"], ["paidOrders", "Paid credit orders"],
      ["amount", "Gross credit payments"], ["creditsPurchased", "Credits purchased"], ["creditsDebited", "Credits debited"],
    ],
    metrics: [["bookings", "Scheduled visits"], ["paidOrders", "Paid orders"], ["amount", "Gross credit payments"], ["creditsPurchased", "Credits purchased"]],
    caption: "Visits are counted by appointment date. Gross payments include paid credit orders.",
  },
};

function downloadTrend(role, data, metrics) {
  const columns = metrics.map(([key]) => key);
  const csv = [
    ["Date", ...metrics.map(([key, title]) => key === "amount" ? `${title} (INR)` : title)].join(","),
    ...data.trend.map((row) => [row.date, ...columns.map((key) => key === "amount" ? row[key] / 100 : row[key] ?? "")].join(",")),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const download = document.createElement("a");
  download.href = url;
  download.download = `${role}-analytics-${data.start}-to-${data.end}.csv`;
  download.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function DashboardAnalytics({ role }) {
  const view = views[role];
  const [days, setDays] = useState("30");
  const [metric, setMetric] = useState("bookings");
  const [result, setResult] = useState({ data: null, error: "" });
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    axios.get(`${API}/${role}/analytics`, {
      params: { days },
      headers: { Authorization: `Bearer ${Cookies.get(view.cookie)}` },
      withCredentials: true,
      signal: controller.signal,
    }).then(({ data }) => {
      if (!controller.signal.aborted) setResult({ data, error: "" });
    }).catch((error) => {
      if (controller.signal.aborted) return;
      setResult({ data: null, error: error.response?.data?.msg || "Couldn't load analytics. Try again." });
    });
    return () => controller.abort();
  }, [days, refresh, role, view.cookie]);

  const refetch = () => {
    setResult({ data: null, error: "" });
    setRefresh((value) => value + 1);
  };
  const { data, error } = result;
  const metricLabel = view.metrics.find(([key]) => key === metric)[1];
  const hasTrend = data?.trend.some((row) => row[metric] > 0);

  return (
    <section className="grid min-w-0 gap-4 rounded-[28px] bg-white p-5 shadow-[0_8px_30px_rgba(79,70,229,0.06)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold">{view.title}</h2>
          <p className="mt-1 text-sm text-[#6B6A8A]">
            {data && `${shortDate(data.start)} – ${shortDate(data.end)} · `}India time
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm font-semibold">
            Period
            <select className="rounded-xl bg-[#F6F6FD] px-3 py-2" value={days} onChange={(event) => {
              setResult({ data: null, error: "" });
              setDays(event.target.value);
            }}>
              {[7, 30, 90].map((value) => <option key={value} value={value}>{value} days</option>)}
            </select>
          </label>
          <button type="button" disabled={!data} onClick={() => downloadTrend(role, data, view.metrics)}
            className="flex items-center gap-1.5 rounded-full bg-[#EEEDFF] px-3 py-2 text-sm font-bold text-indigo-700 disabled:opacity-50">
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>
      {error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-[#FFECEB] p-3 text-sm text-[#B42318]">
        <p className="flex-1">{error}</p>
        <button type="button" onClick={refetch} className="flex items-center gap-1 font-bold"><RefreshCw size={14} /> Retry</button>
      </div>}
      {!data && !error && <p role="status" className="text-sm text-[#6B6A8A]">Loading analytics…</p>}
      {data && (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {view.tiles.map(([key, label]) => <div key={key} className="rounded-2xl bg-[#F6F6FD] p-4">
              <dt className="text-sm font-semibold text-[#6B6A8A]">{label}</dt>
              <dd className="mt-1 text-2xl font-extrabold text-[#312E81]">{format(key, data.summary[key])}</dd>
            </div>)}
          </dl>
          <label className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            Daily trend
            <select className="rounded-xl bg-[#F6F6FD] px-3 py-2" value={metric} onChange={(event) => setMetric(event.target.value)}>
              {view.metrics.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          {hasTrend ? <div className="h-[245px] min-w-0" role="img" aria-label={`Daily trend for ${metricLabel}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend} margin={{ top: 6, left: 4, right: 16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#E7E5F5" />
                <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={30} tick={{ fontSize: 11 }} />
                <YAxis domain={metric === "rating" ? [0, 5] : [0, "auto"]} allowDecimals={metric === "rating"}
                  width={metric === "amount" ? 92 : 36} tickFormatter={(value) => format(metric, value)} tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={shortDate} formatter={(value) => [format(metric, value), metricLabel]} />
                <Area name={metricLabel} dataKey={metric} stroke="#4F46E5" strokeWidth={2} fill="#E0E7FF" dot={metric === "rating"} />
              </AreaChart>
            </ResponsiveContainer>
          </div> : <p className="rounded-xl bg-[#F6F6FD] p-4 text-sm text-[#6B6A8A]">No data for this metric in the selected period.</p>}
          <p className="text-xs text-[#6B6A8A]">{view.caption}</p>
        </>
      )}
    </section>
  );
}

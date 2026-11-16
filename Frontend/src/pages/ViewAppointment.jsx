import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { Loader2, CalendarCheck } from "lucide-react";
import { PageHeader, Toast, ConfirmModal, Avatar, Tabs, SearchPill, Pagination, EmptyState, RowSkeleton } from "../components/AdminUI";
import { STATUS_PILL } from "../components/adminStyles";

const PAGE_SIZE = 8;
const adminAuth = () => ({ headers: { Authorization: `Bearer ${Cookies.get("emtoken")}` }, withCredentials: true });

const ViewAppointment = () => {
  const [appointments, setAppointments]       = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [showModal, setShowModal]             = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedAppointment, setSelected]    = useState(null);
  const [type, setType]                       = useState("pending");
  const [searchTerm, setSearch]               = useState("");
  const [page, setPage]                       = useState(1);
  const [date, setDate]                       = useState("");
  const [time, setTime]                       = useState("");
  const [submitting, setSubmitting]           = useState(false);
  const [toast, setToast]                     = useState(null);

  useEffect(() => { fetchAppointments(); }, []);
  useEffect(() => { setPage(1); }, [type, searchTerm]);

  const showToast = (message, t = "success") => setToast({ message, type: t });

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await axios.get(import.meta.env.VITE_API_URL + "/viewappointment", {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Cookies.get("emtoken")}` },
        withCredentials: true,
      });
      setAppointments(res.data.appointments);
    } catch {
      showToast("Failed to load appointments", "error");
    } finally {
      setLoading(false);
    }
  };

  const openApproveModal = (app) => { setSelected(app); setDate(""); setTime(""); setShowModal(true); };
  const openRejectModal  = (app) => { setSelected(app); setShowRejectModal(true); };

  const confirmAppointment = async () => {
    if (!date || !time) return showToast("Please select both date and time", "error");
    setSubmitting(true);
    try {
      await axios.post(import.meta.env.VITE_API_URL + "/approveappointment", { ...selectedAppointment, date, time }, adminAuth());
      await axios.put(import.meta.env.VITE_API_URL + "/appointmentstatus", { id: selectedAppointment._id, status: "approved" }, adminAuth());
      showToast("Appointment approved successfully");
      setShowModal(false);
      fetchAppointments();
    } catch {
      showToast("Failed to approve appointment", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const rejectAppointment = async () => {
    setSubmitting(true);
    try {
      await axios.put(import.meta.env.VITE_API_URL + "/appointmentstatus", { id: selectedAppointment._id, status: "rejected" }, adminAuth());
      showToast("Appointment rejected");
      setShowRejectModal(false);
      fetchAppointments();
    } catch {
      showToast("Failed to reject appointment", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const counts = {
    pending:  appointments.filter((a) => a.status === "pending").length,
    approved: appointments.filter((a) => a.status === "approved").length,
    rejected: appointments.filter((a) => a.status === "rejected").length,
  };

  const filtered = useMemo(() =>
    appointments
      .filter((a) => a.status === type)
      .filter((a) =>
        a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.doctormail?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [appointments, type, searchTerm]
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const start      = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end        = Math.min(page * PAGE_SIZE, filtered.length);

  const inputCls = "w-full h-12 px-4 rounded-[18px] bg-[#F6F6FD] border-2 border-transparent text-sm font-medium focus:outline-none focus:border-indigo-300 focus:bg-white";

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-2 lg:py-2">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {showModal && selectedAppointment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-[#1E1B4B]/40" onClick={() => setShowModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white rounded-[32px] p-7 flex flex-col gap-4">
            <h3 className="text-xl font-extrabold">Confirm this appointment</h3>
            <div className="flex items-center gap-3 p-4 rounded-[20px] bg-[#F6F6FD]">
              <Avatar name={selectedAppointment.name} />
              <div className="min-w-0">
                <p className="text-sm font-extrabold truncate">{selectedAppointment.name}</p>
                <p className="text-[13px] text-[#6B6A8A] truncate">with {selectedAppointment.doctormail}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-[13px] font-bold text-[#4B4A6B]">Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></label>
              <label className="flex flex-col gap-1.5 text-[13px] font-bold text-[#4B4A6B]">Time<input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} /></label>
            </div>
            <div className="flex gap-2.5 mt-1">
              <button onClick={() => setShowModal(false)} disabled={submitting} className="flex-1 h-12 rounded-full bg-[#F6F6FD] text-[#4B4A6B] font-bold">Cancel</button>
              <button onClick={confirmAppointment} disabled={submitting} className="flex-1 h-12 rounded-full bg-[#12B76A] hover:bg-[#039855] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                {submitting && <Loader2 size={15} className="animate-spin" />} Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && selectedAppointment && (
        <ConfirmModal title="Reject this request?" message={`${selectedAppointment.name}'s request will be declined. Their credits are not refunded.`}
          confirmLabel="Reject" loading={submitting} onConfirm={rejectAppointment} onCancel={() => setShowRejectModal(false)} />
      )}

      <div className="flex flex-col gap-[22px] pb-16">
        <PageHeader title="Appointment requests" subtitle="Give each request a date and time, or decline it.">
          <SearchPill value={searchTerm} onChange={setSearch} placeholder="Search patient or doctor" />
        </PageHeader>

        <Tabs label="Request status" value={type} onChange={setType}
          tabs={[{ id: "pending", label: "Pending", count: counts.pending }, { id: "approved", label: "Approved", count: counts.approved }, { id: "rejected", label: "Rejected", count: counts.rejected }]} />

        <div className="flex flex-col gap-3">
          {loading && [1, 2, 3, 4].map((i) => <RowSkeleton key={i} />)}
          {!loading && filtered.length === 0 && (
            <EmptyState icon={CalendarCheck} text={searchTerm ? `No results for "${searchTerm}"` : `No ${type} requests`} onClear={searchTerm ? () => setSearch("") : null} />
          )}

          {!loading && paginated.map((app, i) => (
            <article key={app._id} className="flex flex-wrap items-center gap-4 p-5 rounded-[26px] bg-white shadow-[0_8px_30px_rgba(79,70,229,0.06)]">
              <Avatar name={app.name} index={i} size="w-14 h-14" />
              <div className="flex-[1_1_200px] min-w-0">
                <p className="text-base font-extrabold truncate">{app.name}</p>
                <p className="text-[13px] text-[#6B6A8A] truncate">{app.email}</p>
              </div>
              <div className="flex-[1_1_200px] min-w-0">
                <p className="text-[13px] font-bold text-[#4B4A6B]">Doctor</p>
                <p className="text-sm font-semibold truncate">{app.doctormail}</p>
              </div>
              {app.description && <p className="flex-[1_1_200px] min-w-0 px-4 py-2 rounded-[18px] bg-[#F6F6FD] text-[13px] text-[#4B4A6B] truncate" title={app.description}>"{app.description}"</p>}
              {type === "pending" ? (
                <div className="flex gap-2">
                  <button onClick={() => openRejectModal(app)} className="h-10 px-4 rounded-full bg-[#FFECEB] text-[#B42318] text-sm font-bold hover:bg-[#FFDAD7]">Reject</button>
                  <button onClick={() => openApproveModal(app)} className="h-10 px-5 rounded-full bg-[#12B76A] hover:bg-[#039855] text-white text-sm font-bold">Approve</button>
                </div>
              ) : (
                <span className={`px-3.5 py-1.5 rounded-full text-[13px] font-extrabold capitalize ${STATUS_PILL[type]}`}>{type}</span>
              )}
            </article>
          ))}

          {!loading && <Pagination page={page} totalPages={totalPages} onChange={setPage} start={start} end={end} total={filtered.length} />}
        </div>
      </div>
    </div>
  );
};

export default ViewAppointment;

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { UserPlus, Loader2, FileText, Mail, Phone } from "lucide-react";
import { PageHeader, Toast, ConfirmModal, Avatar, Tabs, SearchPill, Pagination, EmptyState, RowSkeleton } from "../components/AdminUI";
import { STATUS_PILL } from "../components/adminStyles";

const PAGE_SIZE = 8;

const DoctorRequest = () => {
  const [doctors, setDoctors]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [type, setType]               = useState("pending");
  const [searchTerm, setSearch]       = useState("");
  const [page, setPage]               = useState(1);
  const [toast, setToast]             = useState(null);
  const [rejectTarget, setReject]     = useState(null);
  const [approving, setApproving]     = useState(null);
  const [rejecting, setRejecting]     = useState(false);

  useEffect(() => { fetchDoctors(); }, []);
  useEffect(() => { setPage(1); }, [type, searchTerm]);

  const showToast = (message, t = "success") => setToast({ message, type: t });

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const res = await axios.get(import.meta.env.VITE_API_URL + "/doctorrequest");
      setDoctors(res.data.doctors || res.data || []);
    } catch {
      showToast("Failed to load requests", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (doc) => {
    setApproving(doc._id);
    try {
      await axios.post(import.meta.env.VITE_API_URL + "/doctorregister", {
        name: doc.name, email: doc.email, contact: doc.contact,
        specialization: doc.specialization, address: doc.address,
      });
      await axios.put(import.meta.env.VITE_API_URL + "/doctorpermissionupdate", { id: doc._id, permission: "approved" });
      setDoctors((prev) => prev.map((d) => d._id === doc._id ? { ...d, permission: "approved" } : d));
      showToast(`${doc.name} approved`);
    } catch (err) {
      showToast(err.response?.data?.message || err.response?.data?.msg || "Failed to approve request", "error");
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      await axios.put(import.meta.env.VITE_API_URL + "/doctorpermissionupdate", { id: rejectTarget._id, permission: "rejected" });
      setDoctors((prev) => prev.map((d) => d._id === rejectTarget._id ? { ...d, permission: "rejected" } : d));
      showToast(`${rejectTarget.name} rejected`);
      setReject(null);
    } catch {
      showToast("Failed to reject request", "error");
    } finally {
      setRejecting(false);
    }
  };

  const counts = {
    pending:  doctors.filter((d) => d.permission === "pending").length,
    approved: doctors.filter((d) => d.permission === "approved").length,
    rejected: doctors.filter((d) => d.permission === "rejected").length,
  };

  const filtered = useMemo(() =>
    doctors
      .filter((d) => d.permission === type)
      .filter((d) =>
        d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [doctors, type, searchTerm]
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const start      = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end        = Math.min(page * PAGE_SIZE, filtered.length);

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-2 lg:py-2">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {rejectTarget && (
        <ConfirmModal title="Reject this doctor?" message={`${rejectTarget.name}'s application will be declined. This can't be undone.`}
          confirmLabel="Reject" loading={rejecting} onConfirm={handleReject} onCancel={() => setReject(null)} />
      )}

      <div className="flex flex-col gap-[22px] pb-16">
        <PageHeader title="Doctor requests" subtitle="Check credentials, then approve doctors so patients can book them.">
          <SearchPill value={searchTerm} onChange={setSearch} placeholder="Search name, specialty or email" />
        </PageHeader>

        <Tabs label="Request status" value={type} onChange={setType}
          tabs={[{ id: "pending", label: "Pending", count: counts.pending }, { id: "approved", label: "Approved", count: counts.approved }, { id: "rejected", label: "Rejected", count: counts.rejected }]} />

        <div className="flex flex-col gap-3">
          {loading && [1, 2, 3, 4].map((i) => <RowSkeleton key={i} />)}

          {!loading && filtered.length === 0 && (
            <EmptyState icon={UserPlus} text={searchTerm ? `No results for "${searchTerm}"` : `No ${type} requests`} onClear={searchTerm ? () => setSearch("") : null} />
          )}

          {!loading && paginated.map((doc, i) => (
            <article key={doc._id} className="flex flex-wrap items-center gap-4 p-5 rounded-[26px] bg-white shadow-[0_8px_30px_rgba(79,70,229,0.06)]">
              <Avatar name={doc.name} index={i} size="w-14 h-14" />
              <div className="flex-[1_1_220px] min-w-0">
                <p className="text-base font-extrabold truncate">Dr. {doc.name}</p>
                <p className="text-[13px] text-[#6B6A8A] flex flex-wrap gap-x-3">
                  <span className="flex items-center gap-1 truncate"><Mail size={12} /> {doc.email}</span>
                  {doc.contact && <span className="flex items-center gap-1"><Phone size={12} /> {doc.contact}</span>}
                </p>
              </div>
              <span className="px-3.5 py-1.5 rounded-full bg-[#EEEDFF] text-[#3730A3] text-[13px] font-bold">{doc.specialization || "No specialty"}</span>
              {doc.certificate ? (
                <a href={doc.certificate} target="_blank" rel="noreferrer" className="h-10 px-4 rounded-full bg-[#F6F6FD] text-indigo-600 text-sm font-bold flex items-center gap-1.5 hover:bg-[#EEEDFF]">
                  <FileText size={15} /> Certificate
                </a>
              ) : (
                <span className="text-[13px] font-semibold text-[#9A99B5]">No certificate</span>
              )}
              {type === "pending" ? (
                <div className="flex gap-2">
                  <button onClick={() => setReject(doc)} className="h-10 px-4 rounded-full bg-[#FFECEB] text-[#B42318] text-sm font-bold hover:bg-[#FFDAD7]">Reject</button>
                  <button onClick={() => handleApprove(doc)} disabled={approving === doc._id} className="h-10 px-5 rounded-full bg-[#12B76A] hover:bg-[#039855] text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-50">
                    {approving === doc._id && <Loader2 size={14} className="animate-spin" />} Approve
                  </button>
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

export default DoctorRequest;

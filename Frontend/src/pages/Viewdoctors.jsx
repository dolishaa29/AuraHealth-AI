import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Stethoscope, Loader2, Trash2 } from "lucide-react";
import { PageHeader, Toast, ConfirmModal, Avatar, SearchPill, Pagination, EmptyState, RowSkeleton } from "../components/AdminUI";
import { STATUS_PILL } from "../components/adminStyles";

const PAGE_SIZE = 8;

const ViewDoctors = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState("");
  const [page, setPage]                 = useState(1);
  const [toast, setToast]               = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);
  const [blocking, setBlocking]         = useState(null);

  useEffect(() => { fetchDoctors(); }, []);

  useEffect(() => { setPage(1); }, [searchTerm]);

  const showToast = (message, type = "success") => setToast({ message, type });

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const res = await axios.get(import.meta.env.VITE_API_URL + "/viewdoctors");
      setDoctors(res.data.doctors || []);
    } catch {
      showToast("Failed to load doctors", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.post(import.meta.env.VITE_API_URL + "/deletedoctor", { id: deleteTarget._id });
      setDoctors((prev) => prev.filter((d) => d._id !== deleteTarget._id));
      showToast(`Dr. ${deleteTarget.name} removed`);
      setDeleteTarget(null);
    } catch {
      showToast("Failed to delete doctor", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleBlock = async (doctor) => {
    setBlocking(doctor._id);
    try {
      const res = await axios.post(import.meta.env.VITE_API_URL + "/blockdoctor", { id: doctor._id });
      if (res.data.success) {
        const newStatus = res.data.data.doctorstatus;
        setDoctors((prev) =>
          prev.map((d) => d._id === doctor._id ? { ...d, doctorstatus: newStatus } : d)
        );
        showToast(`Dr. ${doctor.name} ${newStatus === "block" ? "blocked" : "unblocked"}`);
      }
    } catch {
      showToast("Failed to update status", "error");
    } finally {
      setBlocking(null);
    }
  };

  const filtered = useMemo(() =>
    doctors.filter((d) =>
      d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [doctors, searchTerm]
  );

  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const start       = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end         = Math.min(page * PAGE_SIZE, filtered.length);

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-2 lg:py-2">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {deleteTarget && (
        <ConfirmModal title="Remove this doctor?" message={`Dr. ${deleteTarget.name} will be removed from AuraHealth. This can't be undone.`}
          confirmLabel="Remove" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}

      <div className="flex flex-col gap-[22px] pb-16">
        <PageHeader title="Doctors" subtitle={loading ? "Loading…" : `${filtered.length} doctor${filtered.length === 1 ? "" : "s"} on AuraHealth`}>
          <SearchPill value={searchTerm} onChange={setSearchTerm} placeholder="Search name, specialty or email" />
        </PageHeader>

        <div className="flex flex-col gap-3">
          {loading && [1, 2, 3, 4].map((i) => <RowSkeleton key={i} />)}
          {!loading && filtered.length === 0 && (
            <EmptyState icon={Stethoscope} text={searchTerm ? `No results for "${searchTerm}"` : "No doctors registered yet"} onClear={searchTerm ? () => setSearchTerm("") : null} />
          )}

          {!loading && paginated.map((doctor, i) => {
            const blocked = doctor.doctorstatus === "block";
            return (
              <article key={doctor._id} className="flex flex-wrap items-center gap-4 p-5 rounded-[26px] bg-white shadow-[0_8px_30px_rgba(79,70,229,0.06)]">
                <Avatar name={doctor.name} index={i} size="w-14 h-14" />
                <div className="flex-[1_1_220px] min-w-0">
                  <p className="text-base font-extrabold truncate">Dr. {doctor.name}</p>
                  <p className="text-[13px] text-[#6B6A8A] truncate">{doctor.email}{doctor.contact ? ` · ${doctor.contact}` : ""}</p>
                </div>
                <span className="px-3.5 py-1.5 rounded-full bg-[#EEEDFF] text-[#3730A3] text-[13px] font-bold">{doctor.specialization || "No specialty"}</span>
                <span className={`px-3.5 py-1.5 rounded-full text-[13px] font-extrabold flex items-center gap-1.5 ${blocked ? STATUS_PILL.block : STATUS_PILL.unblock}`}>
                  <span className={`w-2 h-2 rounded-full ${blocked ? "bg-[#F04438]" : "bg-[#12B76A]"}`} /> {blocked ? "Blocked" : "Active"}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/doctorprofileview/${doctor._id}`)} className="h-10 px-4 rounded-full bg-[#F6F6FD] text-indigo-600 text-sm font-bold hover:bg-[#EEEDFF]">Profile</button>
                  <button onClick={() => handleBlock(doctor)} disabled={blocking === doctor._id}
                    className={`h-10 px-4 rounded-full text-sm font-bold flex items-center gap-1.5 disabled:opacity-50 ${blocked ? "bg-[#E7F7EF] text-[#05603A]" : "bg-[#FFF4E5] text-[#B45309]"}`}>
                    {blocking === doctor._id && <Loader2 size={14} className="animate-spin" />} {blocked ? "Unblock" : "Block"}
                  </button>
                  <button onClick={() => setDeleteTarget(doctor)} aria-label={`Remove Dr. ${doctor.name}`} className="w-10 h-10 rounded-full bg-[#FFECEB] text-[#B42318] flex items-center justify-center hover:bg-[#FFDAD7]"><Trash2 size={16} /></button>
                </div>
              </article>
            );
          })}

          {!loading && <Pagination page={page} totalPages={totalPages} onChange={setPage} start={start} end={end} total={filtered.length} />}
        </div>
      </div>
    </div>
  );
};

export default ViewDoctors;

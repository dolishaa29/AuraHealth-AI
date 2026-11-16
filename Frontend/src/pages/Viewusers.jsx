import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Users, Loader2 } from "lucide-react";
import { PageHeader, Toast, Avatar, SearchPill, Pagination, EmptyState, RowSkeleton } from "../components/AdminUI";
import { STATUS_PILL } from "../components/adminStyles";

const PAGE_SIZE = 8;

const Viewusers = () => {
  const navigate = useNavigate();
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [searchTerm, setSearch] = useState("");
  const [page, setPage]         = useState(1);
  const [toast, setToast]       = useState(null);
  const [blocking, setBlocking] = useState(null);

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => { setPage(1); }, [searchTerm]);

  const showToast = (message, type = "success") => setToast({ message, type });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(import.meta.env.VITE_API_URL + "/viewusers");
      setUsers(res.data.users || []);
    } catch {
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async (user) => {
    setBlocking(user._id);
    try {
      const res = await axios.post(import.meta.env.VITE_API_URL + "/blockuser", { id: user._id });
      if (res.data.success) {
        const newStatus = res.data.data.userstatus;
        setUsers((prev) => prev.map((u) => u._id === user._id ? { ...u, userstatus: newStatus } : u));
        showToast(`${user.name} ${newStatus === "block" ? "blocked" : "unblocked"}`);
      }
    } catch {
      showToast("Failed to update status", "error");
    } finally {
      setBlocking(null);
    }
  };

  const filtered = useMemo(() =>
    users.filter((u) =>
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.contact?.toString().includes(searchTerm)
    ),
    [users, searchTerm]
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const start      = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end        = Math.min(page * PAGE_SIZE, filtered.length);

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-2 lg:py-2">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col gap-[22px] pb-16">
        <PageHeader title="Patients" subtitle={loading ? "Loading…" : `${filtered.length} patient${filtered.length === 1 ? "" : "s"} signed up`}>
          <SearchPill value={searchTerm} onChange={setSearch} placeholder="Search name, email or phone" />
        </PageHeader>

        <div className="flex flex-col gap-3">
          {loading && [1, 2, 3, 4].map((i) => <RowSkeleton key={i} />)}
          {!loading && filtered.length === 0 && (
            <EmptyState icon={Users} text={searchTerm ? `No results for "${searchTerm}"` : "No patients yet"} onClear={searchTerm ? () => setSearch("") : null} />
          )}

          {!loading && paginated.map((user, i) => {
            const blocked = user.userstatus === "block";
            return (
              <article key={user._id} className="flex flex-wrap items-center gap-4 p-5 rounded-[26px] bg-white shadow-[0_8px_30px_rgba(79,70,229,0.06)]">
                <Avatar name={user.name} index={i} size="w-14 h-14" />
                <div className="flex-[1_1_220px] min-w-0">
                  <p className="text-base font-extrabold truncate">{user.name}</p>
                  <p className="text-[13px] text-[#6B6A8A] truncate">{user.email}{user.contact ? ` · ${user.contact}` : ""}</p>
                </div>
                {user.address && <span className="max-w-[220px] truncate px-3.5 py-1.5 rounded-full bg-[#F6F6FD] text-[#4B4A6B] text-[13px] font-semibold">{user.address}</span>}
                <span className={`px-3.5 py-1.5 rounded-full text-[13px] font-extrabold flex items-center gap-1.5 ${blocked ? STATUS_PILL.block : STATUS_PILL.unblock}`}>
                  <span className={`w-2 h-2 rounded-full ${blocked ? "bg-[#F04438]" : "bg-[#12B76A]"}`} /> {blocked ? "Blocked" : "Active"}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/userbyid/${user._id}`)} className="h-10 px-4 rounded-full bg-[#F6F6FD] text-indigo-600 text-sm font-bold hover:bg-[#EEEDFF]">Profile</button>
                  <button onClick={() => handleBlock(user)} disabled={blocking === user._id}
                    className={`h-10 px-4 rounded-full text-sm font-bold flex items-center gap-1.5 disabled:opacity-50 ${blocked ? "bg-[#E7F7EF] text-[#05603A]" : "bg-[#FFF4E5] text-[#B45309]"}`}>
                    {blocking === user._id && <Loader2 size={14} className="animate-spin" />} {blocked ? "Unblock" : "Block"}
                  </button>
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

export default Viewusers;

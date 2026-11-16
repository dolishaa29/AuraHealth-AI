import axios from 'axios';
import { useEffect, useState, useMemo } from 'react';
import DoctorCard from '../components/DoctorCard';
import { Search, X } from 'lucide-react';

const PILL_COLORS = ["bg-[#FFF0E6] text-[#9A3412]", "bg-[#FFECEB] text-[#B42318]", "bg-[#E7F7EF] text-[#05603A]", "bg-[#E6F1FF] text-[#1E40AF]", "bg-[#EEEDFF] text-[#3730A3]"];

const ViewDoctorss = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [specialty, setSpecialty] = useState('All');

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_API_URL}/viewdoctors`)
      .then((res) => setDoctors(res.data.doctors || []))
      .catch((err) => console.error("Error fetching doctors:", err))
      .finally(() => setLoading(false));
  }, []);

  const specialties = useMemo(
    () => ['All', ...new Set(doctors.map((d) => d.specialization).filter(Boolean))].slice(0, 8),
    [doctors]
  );

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return doctors.filter((d) =>
      (specialty === 'All' || d.specialization === specialty) &&
      [d.name, d.specialization, d.hospitalName].some((v) => v?.toLowerCase().includes(q))
    );
  }, [doctors, searchTerm, specialty]);

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-2 lg:py-2">
      <div className="flex flex-col gap-[22px] pb-24">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-[-0.025em]">Find a doctor who gets you</h1>
          <p className="mt-1.5 text-[15px] text-[#6B6A8A]">Verified specialists, video or in-clinic. Booking takes under a minute.</p>
        </div>

        <label className="flex items-center gap-3 h-14 px-[22px] rounded-full bg-white text-[#6B6A8A] shadow-[0_8px_30px_rgba(79,70,229,0.06)] focus-within:ring-2 focus-within:ring-indigo-200">
          <Search size={20} />
          <span className="sr-only">Search doctors</span>
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name, specialty or hospital"
            className="flex-1 bg-transparent text-[15px] text-[#1E1B4B] placeholder:text-[#9A99B5] focus:outline-none" />
          {searchTerm && <button onClick={() => setSearchTerm('')} aria-label="Clear search" className="w-8 h-8 rounded-full hover:bg-[#F6F6FD] flex items-center justify-center"><X size={16} /></button>}
        </label>

        {specialties.length > 1 && (
          <div role="group" aria-label="Specialty" className="flex flex-wrap gap-2">
            {specialties.map((s, i) => (
              <button key={s} onClick={() => setSpecialty(s)} aria-pressed={specialty === s}
                className={`h-[42px] px-[18px] rounded-full text-sm font-bold transition-all ${specialty === s ? 'bg-indigo-600 text-white' : i === 0 ? 'bg-white text-[#4B4A6B]' : PILL_COLORS[(i - 1) % PILL_COLORS.length]}`}>
                {s}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => <div key={n} className="h-56 rounded-[28px] bg-white animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg font-extrabold">{doctors.length ? 'No doctors match your search' : 'No doctors available right now'}</p>
            {(searchTerm || specialty !== 'All') && (
              <button onClick={() => { setSearchTerm(''); setSpecialty('All'); }} className="mt-4 h-11 px-5 rounded-full bg-[#EEEDFF] text-[#3730A3] text-sm font-bold">Clear filters</button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-[#6B6A8A]">{filtered.length} {filtered.length === 1 ? 'doctor' : 'doctors'}</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
              {filtered.map((doc, i) => {
                const image = doc.image ? `${import.meta.env.VITE_API_URL}/images/${doc.image.split(/[\\/]/).pop()}` : null;
                return <DoctorCard key={doc._id} doctor={doc} image={image} index={i} />;
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ViewDoctorss;

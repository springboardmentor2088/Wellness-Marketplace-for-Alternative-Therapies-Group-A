import { useState, useEffect } from "react";
import axios from "axios";
import { getAllSessions } from "../services/sessionService";
import { 
  Stethoscope, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  FileText,
  Download,
  Search,
  ChevronRight
} from "lucide-react";
import toast from "react-hot-toast";

export default function AdminClinical() {
  const [activeSubTab, setActiveSubTab] = useState("vetting");
  const [practitioners, setPractitioners] = useState([]);
  const [selectedPractitioner, setSelectedPractitioner] = useState(null);
  const [practitionersLoading, setPractitionersLoading] = useState(true);
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Rejection Modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (activeSubTab === "vetting") fetchPractitioners();
    if (activeSubTab === "sessions") fetchSessions();
  }, [activeSubTab]);

  const fetchPractitioners = async () => {
    try {
      setPractitionersLoading(true);
      const token = localStorage.getItem("accessToken");
      const res = await axios.get("/api/practitioners", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPractitioners(res.data);
    } catch (err) {
      toast.error("Failed to load practitioners");
    } finally {
      setPractitionersLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const data = await getAllSessions();
      setSessions(data || []);
    } catch (err) {
      toast.error("Failed to load sessions");
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchDocs = async (id) => {
    try {
      setDocsLoading(true);
      const token = localStorage.getItem("accessToken");
      const res = await axios.get(`/api/practitioners/${id}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocs(res.data || []);
    } catch (err) {
      toast.error("Failed to load documents");
    } finally {
      setDocsLoading(false);
    }
  };

  const handleVerify = async (id, status, reason = "") => {
    try {
      const token = localStorage.getItem("accessToken");
      await axios.put(`/api/practitioners/${id}/verify`, null, {
        params: { verified: status, rejectionReason: reason },
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(status ? "Practitioner Approved" : "Practitioner Rejected");
      fetchPractitioners();
      setSelectedPractitioner(null);
      setShowRejectModal(false);
    } catch (err) {
      toast.error("Operation failed");
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm w-fit mb-8">
        <button
          onClick={() => setActiveSubTab("vetting")}
          className={`px-6 py-3 text-sm font-black rounded-xl transition-all ${
            activeSubTab === "vetting" ? "bg-teal-600 text-white shadow-lg shadow-teal-100" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Doctor Vetting
        </button>
        <button
          onClick={() => setActiveSubTab("sessions")}
          className={`px-6 py-3 text-sm font-black rounded-xl transition-all ${
            activeSubTab === "sessions" ? "bg-teal-600 text-white shadow-lg shadow-teal-100" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Clinical Sessions
        </button>
      </div>

      {activeSubTab === "vetting" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-4">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Stethoscope className="text-teal-600" size={24} />
                Verification Queue
            </h2>
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-50">
                    {practitionersLoading ? (
                        Array(5).fill(0).map((_, i) => <div key={i} className="h-20 bg-slate-50 animate-pulse" />)
                    ) : practitioners.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 font-bold">No pending requests</div>
                    ) : (
                        practitioners.map(p => (
                            <button
                                key={p.id}
                                onClick={() => { setSelectedPractitioner(p); fetchDocs(p.id); }}
                                className={`w-full p-5 text-left transition-all hover:bg-slate-50 flex items-center justify-between group ${selectedPractitioner?.id === p.id ? "bg-teal-50" : ""}`}
                            >
                                <div className="flex gap-4 items-center">
                                    <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-black">
                                        {p.userName?.[0]}
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 leading-none mb-1">{p.userName}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{p.specialization}</p>
                                    </div>
                                </div>
                                <div className={`w-2 h-2 rounded-full ${p.verified ? 'bg-green-400' : 'bg-amber-400'}`} />
                            </button>
                        ))
                    )}
                </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            {selectedPractitioner ? (
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50 p-10 space-y-8 animate-in zoom-in-95 duration-300">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-3xl font-black text-slate-900 mb-2">{selectedPractitioner.userName}</h3>
                            <div className="flex gap-2">
                                <span className="bg-teal-50 text-teal-700 px-4 py-1.5 rounded-full text-xs font-black uppercase">{selectedPractitioner.specialization}</span>
                                <span className="bg-slate-50 text-slate-500 px-4 py-1.5 rounded-full text-xs font-black uppercase">{selectedPractitioner.experience} Experience</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-black text-teal-600">₹{selectedPractitioner.consultationFee}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Per Session</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 py-8 border-y border-slate-100">
                        <div className="space-y-4">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Qualifications</p>
                            <p className="text-sm font-bold text-slate-700 leading-relaxed">{selectedPractitioner.qualifications}</p>
                        </div>
                        <div className="space-y-4">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Verification Status</p>
                            <div className="flex items-center gap-2">
                                {selectedPractitioner.verified ? (
                                    <span className="flex items-center gap-1.5 text-green-600 font-black text-xs uppercase"><CheckCircle2 size={16} /> Verified User</span>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-amber-600 font-black text-xs uppercase"><AlertCircle size={16} /> Under Board Review</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Medical Documentation</p>
                        <div className="grid grid-cols-2 gap-4">
                            {docsLoading ? <p className="text-slate-400">Fetching files...</p> : docs.length === 0 ? <p className="text-slate-400 italic">No files uploaded</p> : (
                                docs.map(d => (
                                    <a 
                                        key={d.id} 
                                        href={`/api/practitioners/documents/${d.id}/download`} 
                                        target="_blank"
                                        className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-600 hover:bg-slate-100 transition-all group"
                                    >
                                        <div className="flex items-center gap-3 truncate">
                                            <FileText size={18} className="text-slate-400" />
                                            <span className="text-xs font-bold truncate">{d.fileName}</span>
                                        </div>
                                        <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
                                    </a>
                                ))
                            )}
                        </div>
                    </div>

                    {!selectedPractitioner.verified && (
                        <div className="flex gap-4 pt-4">
                            <button 
                                onClick={() => handleVerify(selectedPractitioner.id, true)}
                                className="flex-1 bg-slate-900 text-white rounded-2xl py-4 font-black shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all transform active:scale-95"
                            >
                                Grant Full Access
                            </button>
                            <button 
                                onClick={() => { setShowRejectModal(true); }}
                                className="flex-1 border-2 border-rose-100 text-rose-600 rounded-2xl py-4 font-black hover:bg-rose-50 transition-all active:scale-95"
                            >
                                Reject Application
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="h-[60vh] rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                    <Stethoscope size={48} className="mb-4 text-slate-300" />
                    <p className="font-bold">Select a practitioner to verify their credentials</p>
                </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === "sessions" && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-900">Patient Engagements</h2>
                <div className="flex bg-slate-50 p-1 rounded-xl">
                    <button className="px-4 py-2 text-[10px] font-black uppercase text-teal-600 bg-white shadow-sm rounded-lg">All History</button>
                    <button className="px-4 py-2 text-[10px] font-black uppercase text-slate-400">Today Only</button>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Timeline</th>
                            <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Patient</th>
                            <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Doctor</th>
                            <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                            <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Clinical Note</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {sessionsLoading ? (
                            Array(5).fill(0).map((_, i) => <tr key={i} className="h-20 bg-slate-50/20 animate-pulse" />)
                        ) : (
                            sessions.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600"><Calendar size={16} /></div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900">{new Date(s.sessionDate).toLocaleDateString()}</p>
                                                <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold">
                                                    <Clock size={10} /> {s.startTime.slice(0,5)} - {s.endTime.slice(0,5)}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6 font-bold text-slate-700">{s.userName}</td>
                                    <td className="p-6 font-bold text-slate-700">{s.practitionerName}</td>
                                    <td className="p-6">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                                            s.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                            s.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {s.status}
                                        </span>
                                    </td>
                                    <td className="p-6 text-right">
                                        {s.prescribedDocumentUrl ? (
                                            <a href={`/api/sessions/${s.id}/document/download`} className="text-teal-600 hover:text-teal-700 font-bold text-xs underline decoration-2 underline-offset-4">Download</a>
                                        ) : <span className="text-slate-300">-</span>}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-6 mx-auto">
              <XCircle size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 text-center">Reject Application?</h3>
            <p className="text-slate-500 text-center mb-6 font-medium">Please provide a valid medical board reason for rejecting this practitioner.</p>
            <textarea 
                value={rejectionReason} 
                onChange={(e) => setRejectionReason(e.target.value)} 
                placeholder="e.g., Medical license expired, Verification failed..." 
                rows={4} 
                className="w-full border-2 border-slate-100 rounded-2xl p-4 mb-8 focus:border-rose-600 outline-none transition-all font-medium"
            />
            <div className="flex gap-4">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 py-4 text-slate-400 font-bold hover:text-slate-600">Dismiss</button>
              <button 
                onClick={() => handleVerify(selectedPractitioner.id, false, rejectionReason)}
                className="flex-1 bg-rose-600 text-white rounded-2xl py-4 font-black shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

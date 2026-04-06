import { useState, useEffect } from "react";
import axios from "axios";
import { 
  ShieldAlert, 
  MessageSquareOff, 
  UserX, 
  Ban, 
  Search, 
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  FileWarning,
  UserCheck
} from "lucide-react";
import toast from "react-hot-toast";

export default function AdminSecurity() {
  const [activeSubTab, setActiveSubTab] = useState("forum-reports");
  const [reports, setReports] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeSubTab === "forum-reports") fetchReports();
    if (activeSubTab === "blocklist") fetchBlockedUsers();
  }, [activeSubTab]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const res = await axios.get("/api/forum/reports", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(res.data || []);
    } catch (err) {
      toast.error("Failed to load forum reports");
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockedUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const res = await axios.get("/api/admin/users", {
        params: { blocked: true, page: 0, size: 50 }, // Getting blocked ones
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter strictly for blocked if the backend doesn't support specific flag yet
      setBlockedUsers(res.data.content.filter(u => u.blocked));
    } catch (err) {
      toast.error("Failed to load blocklist");
    } finally {
      setLoading(false);
    }
  };

  const handleResolveReport = async (id) => {
    try {
      const token = localStorage.getItem("accessToken");
      await axios.put(`/api/forum/reports/${id}/resolve`, null, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Report resolved");
      fetchReports();
    } catch (err) {
      toast.error("Resolution failed");
    }
  };

  const handleUnblock = async (id) => {
    try {
      const token = localStorage.getItem("accessToken");
      await axios.put(`/api/admin/users/${id}/unblock`, null, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("User reinstated");
      fetchBlockedUsers();
    } catch (err) {
      toast.error("Unblock failed");
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm w-fit">
        <button
          onClick={() => setActiveSubTab("forum-reports")}
          className={`flex items-center gap-2 px-6 py-3 text-xs font-black rounded-xl transition-all ${
            activeSubTab === "forum-reports" ? "bg-teal-600 text-white shadow-lg shadow-teal-100" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <MessageSquareOff size={14} /> Forum Moderation
        </button>
        <button
          onClick={() => setActiveSubTab("blocklist")}
          className={`flex items-center gap-2 px-6 py-3 text-xs font-black rounded-xl transition-all ${
            activeSubTab === "blocklist" ? "bg-teal-600 text-white shadow-lg shadow-teal-100" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Ban size={14} /> Global Blocklist
        </button>
      </div>

      {activeSubTab === "forum-reports" && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-900">Community Safety Reports</h2>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Review flagged AI-integrated medical answers</p>
                </div>
                <div className="flex items-center gap-2 text-rose-500 font-black text-xs uppercase bg-rose-50 px-4 py-2 rounded-full">
                    <ShieldAlert size={16} /> Attention Required
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Flagged Content</th>
                            <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Reasoning</th>
                            <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Reported By</th>
                            <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Moderation</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            Array(3).fill(0).map((_, i) => <tr key={i} className="h-24 bg-slate-50 animate-pulse" />)
                        ) : reports.length === 0 ? (
                            <tr><td colSpan="4" className="p-20 text-center font-bold text-slate-300">Clean slate. No community reports.</td></tr>
                        ) : (
                            reports.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-8 max-w-md">
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <p className="text-xs font-bold text-slate-700 leading-relaxed italic truncate">"{r.answerContent}"</p>
                                            <p className="text-[9px] font-black text-slate-400 uppercase mt-2">Author: {r.answerAuthorName}</p>
                                        </div>
                                    </td>
                                    <td className="p-8">
                                        <div className="flex items-center gap-2">
                                            {r.reason === 'Dangerous' ? <AlertTriangle className="text-rose-500" size={14} /> : <FileWarning className="text-amber-500" size={14} />}
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${r.reason === 'Dangerous' ? 'text-rose-600' : 'text-amber-600'}`}>
                                                {r.reason}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-8">
                                        <p className="text-xs font-black text-slate-800">{r.reporterName}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(r.createdAt).toLocaleDateString()}</p>
                                    </td>
                                    <td className="p-8 text-right">
                                        {r.resolved ? (
                                            <span className="flex items-center justify-end gap-1.5 text-green-500 font-black text-[10px] uppercase"><ShieldCheck size={16} /> Neutralized</span>
                                        ) : (
                                            <button 
                                                onClick={() => handleResolveReport(r.id)}
                                                className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-md shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
                                            >
                                                Resolve
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {activeSubTab === "blocklist" && (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-900">Restricted Identities</h2>
                <div className="text-[10px] font-black text-slate-400 uppercase bg-white border border-slate-100 px-4 py-2 rounded-xl">Total: {blockedUsers.length}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {blockedUsers.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border border-slate-100">
                        <UserCheck className="mx-auto text-slate-200 mb-4" size={48} />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Platform harmony. No accounts blocked.</p>
                    </div>
                ) : (
                    blockedUsers.map(u => (
                        <div key={u.id} className="bg-white rounded-[2rem] border-2 border-rose-50 p-8 space-y-6 animate-in zoom-in-95 duration-200">
                            <div className="flex gap-4 items-center">
                                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 font-black text-xl border border-rose-100 shadow-sm relative">
                                    {u.name[0]}
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white" />
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-900">{u.name}</h4>
                                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{u.role}</p>
                                </div>
                            </div>

                            <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-50">
                                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Violation Reason</p>
                                <p className="text-xs font-bold text-rose-700 italic leading-relaxed">"{u.blockingReason || "Violation of community guidelines"}"</p>
                            </div>

                            <button
                                onClick={() => handleUnblock(u.id)}
                                className="w-full bg-white border-2 border-teal-600 text-teal-600 py-3 rounded-xl font-black text-[10px] uppercase hover:bg-teal-600 hover:text-white transition-all transform active:scale-95"
                            >
                                Restore Account Access
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import axios from "axios";
import { UserX, ShieldCheck, Search, ChevronLeft, ChevronRight, Mail, Phone, Calendar } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminUsers() {
  const [role, setRole] = useState("PATIENT");
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [blockingUser, setBlockingUser] = useState(null);
  const [reason, setReason] = useState("");

  const roles = [
    { id: "PATIENT", label: "Patients", icon: <Users size={16} /> },
    { id: "PRACTITIONER", label: "Doctors", icon: <ShieldCheck size={16} /> },
    { id: "PRODUCT_SELLER", label: "Sellers", icon: <ShoppingBag size={16} /> },
    { id: "DELIVERY_AGENT", label: "Delivery Agents", icon: <Truck size={16} /> },
  ];

  useEffect(() => {
    fetchUsers();
  }, [role, page]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const res = await axios.get("/api/admin/users", {
        params: { role, page, size: 8 },
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data.content);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!reason.trim()) return toast.error("Please provide a reason");
    try {
      const token = localStorage.getItem("accessToken");
      await axios.put(`/api/admin/users/${blockingUser.id}/block`, null, {
        params: { reason },
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`${blockingUser.name} blocked`);
      setBlockingUser(null);
      setReason("");
      fetchUsers();
    } catch (err) {
      toast.error("Blocking failed");
    }
  };

  const handleUnblock = async (id) => {
    try {
      const token = localStorage.getItem("accessToken");
      await axios.put(`/api/admin/users/${id}/unblock`, null, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("User unblocked");
      fetchUsers();
    } catch (err) {
      toast.error("Unblocking failed");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Platform Members</h1>
          <p className="text-slate-500 font-medium">Manage and moderate all users across the ecosystem.</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          {["PATIENT", "PRACTITIONER", "PRODUCT_SELLER", "DELIVERY_AGENT"].map((r) => (
            <button
              key={r}
              onClick={() => { setRole(r); setPage(0); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                role === r ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {r.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          Array(4).fill(0).map((_, i) => <div key={i} className="h-48 bg-white rounded-3xl border border-slate-100 animate-pulse" />)
        ) : users.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <Users className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-400 font-bold">No {role.toLowerCase()}s found in the system</p>
          </div>
        ) : (
          users.map((user) => (
            <div key={user.id} className={`group bg-white rounded-3xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${user.blocked ? "border-rose-100 bg-rose-50/10" : "border-slate-100"}`}>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-white shadow-sm overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} alt="" />
                  </div>
                  {user.blocked ? (
                    <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-200">Blocked</span>
                  ) : (
                    <span className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-teal-200">Active</span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-1 truncate">{user.name}</h3>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Mail size={12} />
                    <span className="text-[11px] font-medium truncate">{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone size={12} />
                      <span className="text-[11px] font-medium">{user.phone}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Calendar size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  {user.blocked ? (
                    <button 
                      onClick={() => handleUnblock(user.id)}
                      className="text-teal-600 hover:text-teal-700 font-black text-[10px] uppercase tracking-wider underline underline-offset-4"
                    >
                      Unblock
                    </button>
                  ) : (
                    <button 
                      onClick={() => setBlockingUser(user)}
                      className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                    >
                      <UserX size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-6">
          <button 
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="p-2 border border-slate-200 rounded-xl disabled:opacity-30 hover:bg-white text-slate-600 shadow-sm transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-black text-slate-900 bg-white px-4 py-2 border border-slate-200 rounded-xl shadow-sm">
            {page + 1} <span className="text-slate-400 font-medium">/ {totalPages}</span>
          </span>
          <button 
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="p-2 border border-slate-200 rounded-xl disabled:opacity-30 hover:bg-white text-slate-600 shadow-sm transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Blocking Modal */}
      {blockingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
          <div className="bg-white rounded-[2rem] shadow-2xl p-10 w-full max-w-md border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-6 mx-auto">
              <UserX size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2 text-center">Block {blockingUser.name}?</h2>
            <p className="text-slate-500 text-center mb-8 font-medium">Select a reason to restrict this account's access across the platform.</p>
            
            <div className="space-y-4 mb-10">
              {["Non-compliant pharmaceutical docs", "Suspicious forum activity", "Fraudulent orders", "Inappropriate behavior", "Other"].map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all font-bold text-sm ${
                    reason === r ? "border-slate-900 bg-slate-900 text-white" : "border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200"
                  }`}
                >
                  {r}
                </button>
              ))}
              <textarea 
                value={reason} 
                onChange={(e) => setReason(e.target.value)}
                placeholder="Custom reason..."
                className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-sm focus:border-slate-900 focus:bg-white outline-none transition-all font-medium"
              />
            </div>

            <div className="flex gap-4">
              <button onClick={() => setBlockingUser(null)} className="flex-1 py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors">Cancel</button>
              <button 
                onClick={handleBlock} 
                className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black shadow-lg shadow-rose-200 hover:bg-rose-700 hover:shadow-rose-300 transition-all active:scale-95"
              >
                Block Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper icons that were missing
function ShoppingBag(props) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>; }
function Truck(props) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-5h-4v5Z"/><path d="M13 18h2"/><path d="M7 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M17 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>; }
function Users(props) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }

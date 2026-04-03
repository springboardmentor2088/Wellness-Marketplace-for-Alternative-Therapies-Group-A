import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { 
  HeartPulse, 
  ShoppingBag, 
  Users, 
  ShieldAlert, 
  LogOut,
  LayoutDashboard,
  MessageSquare,
  BarChart3
} from "lucide-react";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { name: "Analytics", path: "/admin/analytics", icon: <BarChart3 size={20} />, description: "Platform Overview & Insights" },
    { name: "Clinical Hub", path: "/admin/clinical", icon: <HeartPulse size={20} />, description: "Clinical Sessions & Doctor Vetting" },
    { name: "Marketplace", path: "/admin/shop", icon: <ShoppingBag size={20} />, description: "Sellers, Inventory & Orders" },
    { name: "User Management", path: "/admin/users", icon: <Users size={20} />, description: "Control all platform members" },
    { name: "Security & Trust", path: "/admin/security", icon: <ShieldAlert size={20} />, description: "Forum Moderation & Blocklist" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("accessToken");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col fixed h-full z-20 transition-all duration-300">
        <div className="p-8 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-[#1f6f66] rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-100">
              <LayoutDashboard size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Admin<span className="text-[#1f6f66]">Central</span></h1>
          </div>
          <p className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Enterprise Control</p>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full group flex items-start gap-4 p-4 rounded-2xl transition-all duration-200 ${
                  isActive 
                    ? "bg-teal-50 text-[#1f6f66] shadow-sm transform scale-[1.02]" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className={`mt-0.5 transition-colors ${isActive ? "text-[#1f6f66]" : "text-slate-400 group-hover:text-slate-600"}`}>
                  {item.icon}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold leading-none mb-1">{item.name}</p>
                  <p className="text-[10px] font-medium text-slate-400 group-hover:text-slate-500">{item.description}</p>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-100 space-y-4">
          <button 
            onClick={() => navigate('/community-forum')}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
          >
            <MessageSquare size={18} className="text-slate-400" />
            Forum
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-72 min-h-screen">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-10 px-10 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                Dashboard / {menuItems.find(i => i.path === location.pathname)?.name || "Overview"}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-900">System Admin</p>
              <p className="text-[10px] font-bold text-green-500 uppercase tracking-tighter">Live Connection</p>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-full border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="avatar" />
            </div>
          </div>
        </header>

        <div className="p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

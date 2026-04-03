import { useState, useEffect } from "react";
import { getAnalyticsDashboard } from "../services/analyticsService";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  Users, CalendarCheck, ShoppingCart, IndianRupee,
  TrendingUp, Award, Loader2
} from "lucide-react";

const COLORS = ["#0d9488", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

const formatCurrency = (val) => {
  if (val == null) return "₹0";
  return "₹" + Number(val).toLocaleString("en-IN");
};

const formatMonth = (m) => {
  if (!m) return "";
  const [y, mo] = m.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[parseInt(mo) - 1] + " " + y.slice(2);
};

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const result = await getAnalyticsDashboard();
      setData(result);
      setError(null);
    } catch (err) {
      console.error("Analytics fetch failed:", err);
      setError("Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-teal-600" />
          <p className="text-slate-500 font-semibold tracking-wide">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <p className="text-red-500 font-bold text-lg">{error}</p>
          <button onClick={fetchAnalytics} className="px-6 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 transition">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    { label: "Total Users", value: data.totalUsers, icon: <Users size={22} />, color: "from-teal-500 to-emerald-600", bgLight: "bg-teal-50", textColor: "text-teal-700" },
    { label: "Sessions", value: data.totalSessions, icon: <CalendarCheck size={22} />, color: "from-indigo-500 to-violet-600", bgLight: "bg-indigo-50", textColor: "text-indigo-700" },
    { label: "Orders", value: data.totalOrders, icon: <ShoppingCart size={22} />, color: "from-amber-500 to-orange-600", bgLight: "bg-amber-50", textColor: "text-amber-700" },
    { label: "Total Revenue", value: formatCurrency(data.totalRevenue), icon: <IndianRupee size={22} />, color: "from-emerald-500 to-green-600", bgLight: "bg-emerald-50", textColor: "text-emerald-700", isString: true },
    { label: "Platform Earnings", value: formatCurrency(data.platformEarnings), icon: <TrendingUp size={22} />, color: "from-purple-500 to-fuchsia-600", bgLight: "bg-purple-50", textColor: "text-purple-700", isString: true },
    { label: "Practitioners", value: data.totalPractitioners, icon: <Award size={22} />, color: "from-sky-500 to-blue-600", bgLight: "bg-sky-50", textColor: "text-sky-700" },
  ];

  const userGrowthData = (data.userGrowth || []).map(d => ({ name: formatMonth(d.month), users: d.count }));
  const sessionTrendData = (data.sessionTrend || []).map(d => ({ name: formatMonth(d.month), sessions: d.count }));
  const orderTrendData = (data.orderTrend || []).map(d => ({ name: formatMonth(d.month), orders: d.count }));
  const revenueTrendData = (data.revenueTrend || []).map(d => ({ name: formatMonth(d.month), revenue: Number(d.amount || 0) }));

  const sessionPieData = Object.entries(data.sessionsByStatus || {}).filter(([, v]) => v > 0).map(([k, v]) => ({ name: k, value: v }));
  const orderPieData = Object.entries(data.ordersByStatus || {}).filter(([, v]) => v > 0).map(([k, v]) => ({ name: k, value: v }));
  const rolePieData = Object.entries(data.usersByRole || {}).filter(([, v]) => v > 0).map(([k, v]) => ({ name: k, value: v }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-slate-400 font-medium mt-1">Platform-wide insights and performance metrics</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
        >
          <TrendingUp size={16} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 group">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center text-white shadow-lg mb-3 group-hover:scale-110 transition-transform`}>
              {kpi.icon}
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
            <p className="text-2xl font-black text-slate-900">
              {kpi.isString ? kpi.value : kpi.value?.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Row 1: Revenue Trend + User Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Revenue Trend</h3>
          {revenueTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueTrendData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => "₹" + v.toLocaleString()} />
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
                <Area type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2.5} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-sm text-center py-16">No revenue data yet</p>}
        </div>

        {/* User Growth */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">User Registrations</h3>
          {userGrowthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
                <Bar dataKey="users" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-sm text-center py-16">No user data yet</p>}
        </div>
      </div>

      {/* Row 2: Session Trend + Order Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Session Trend</h3>
          {sessionTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={sessionTrendData}>
                <defs>
                  <linearGradient id="sessionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
                <Area type="monotone" dataKey="sessions" stroke="#6366f1" strokeWidth={2.5} fill="url(#sessionGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-sm text-center py-16">No session data yet</p>}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Order Trend</h3>
          {orderTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={orderTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
                <Bar dataKey="orders" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-sm text-center py-16">No order data yet</p>}
        </div>
      </div>

      {/* Row 3: Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users by Role */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Users by Role</h3>
          {rolePieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={rolePieData} cx="50%" cy="50%" outerRadius={80} innerRadius={45} dataKey="value" paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10, fontWeight: 700 }}>
                  {rolePieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-sm text-center py-16">No data</p>}
        </div>

        {/* Sessions by Status */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Sessions by Status</h3>
          {sessionPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sessionPieData} cx="50%" cy="50%" outerRadius={80} innerRadius={45} dataKey="value" paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10, fontWeight: 700 }}>
                  {sessionPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-sm text-center py-16">No data</p>}
        </div>

        {/* Orders by Status */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Orders by Status</h3>
          {orderPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={orderPieData} cx="50%" cy="50%" outerRadius={80} innerRadius={45} dataKey="value" paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10, fontWeight: 700 }}>
                  {orderPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-sm text-center py-16">No data</p>}
        </div>
      </div>

      {/* Row 4: Top Practitioners Leaderboard */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Top Practitioners</h3>
        {data.topPractitioners && data.topPractitioners.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <th className="pb-3 font-bold">#</th>
                  <th className="pb-3 font-bold">Name</th>
                  <th className="pb-3 font-bold">Specialization</th>
                  <th className="pb-3 font-bold text-center">Sessions</th>
                  <th className="pb-3 font-bold text-right">Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.topPractitioners.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                        i === 0 ? "bg-amber-100 text-amber-700" :
                        i === 1 ? "bg-slate-100 text-slate-600" :
                        i === 2 ? "bg-orange-50 text-orange-600" :
                        "bg-slate-50 text-slate-400"
                      }`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-3.5 font-bold text-slate-900">{p.name}</td>
                    <td className="py-3.5">
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[11px] font-bold rounded-full">
                        {p.specialization}
                      </span>
                    </td>
                    <td className="py-3.5 text-center font-bold text-slate-700">{p.completedSessions}</td>
                    <td className="py-3.5 text-right font-black text-emerald-600">{formatCurrency(p.totalEarnings)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-400 text-sm text-center py-10">No earnings data yet</p>
        )}
      </div>
    </div>
  );
}

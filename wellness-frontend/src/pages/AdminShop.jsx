import { useState, useEffect } from "react";
import axios from "axios";
import { 
  ShoppingBag, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  ClipboardList,
  IndianRupee,
  Layers,
  Search,
  Plus,
  ArrowUpRight,
  Eye,
  FileBadge
} from "lucide-react";
import toast from "react-hot-toast";

export default function AdminShop() {
  const [activeSubTab, setActiveSubTab] = useState("merchants");
  const [pendingSellers, setPendingSellers] = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ 
    id: null,
    name: "", 
    description: "", 
    price: "", 
    category: "", 
    stock: "", 
    imageUrl: "", 
    imageUrl2: "",
    activeIngredient: "" 
  });

  useEffect(() => {
    refreshData();
  }, [activeSubTab]);

  const refreshData = async () => {
    setLoading(true);
    if (activeSubTab === "merchants") await fetchSellers();
    if (activeSubTab === "inventory-review") await fetchPendingProducts();
    if (activeSubTab === "all-products") await fetchAllProducts();
    if (activeSubTab === "orders") await fetchOrders();
    setLoading(false);
  };

  const fetchSellers = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const res = await axios.get("/api/admin/moderation/sellers/pending", { headers: { Authorization: `Bearer ${token}` } });
      setPendingSellers(res.data);
    } catch (err) { toast.error("Failed to load sellers"); }
  };

  const fetchPendingProducts = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const res = await axios.get("/api/admin/moderation/products/pending", { headers: { Authorization: `Bearer ${token}` } });
      setPendingProducts(res.data);
    } catch (err) { toast.error("Failed to load inventory review"); }
  };

  const fetchAllProducts = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const res = await axios.get("/api/products", { headers: { Authorization: `Bearer ${token}` } });
      setAllProducts(res.data);
    } catch (err) { toast.error("Failed to load products"); }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const res = await axios.get("/api/orders/all", { headers: { Authorization: `Bearer ${token}` } });
      setOrders(res.data);
    } catch (err) { toast.error("Failed to load orders"); }
  };

  const handleModeration = async (type, id, status) => {
    try {
      const token = localStorage.getItem("accessToken");
      const url = type === 'seller' ? `/api/admin/moderation/sellers/${id}/approve` : `/api/admin/moderation/products/${id}/status`;
      const params = type === 'product' ? { status } : {};
      
      await axios.put(url, null, { params, headers: { Authorization: `Bearer ${token}` } });
      toast.success("Moderation successful");
      refreshData();
    } catch (err) { toast.error("Operation failed"); }
  };

  const handleStockUpdate = async (id, stock) => {
    try {
        const token = localStorage.getItem("accessToken");
        await axios.put(`/api/admin/moderation/products/${id}/stock`, null, { 
            params: { stock },
            headers: { Authorization: `Bearer ${token}` } 
        });
        toast.success("Stock manipulated");
        if (activeSubTab === "all-products") fetchAllProducts();
        else fetchPendingProducts();
    } catch (err) { toast.error("Update failed"); }
  }

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
        const token = localStorage.getItem("accessToken");
        const method = productForm.id ? 'put' : 'post';
        const url = productForm.id ? `/api/products/${productForm.id}` : '/api/products';
        
        await axios[method](url, productForm, { headers: { Authorization: `Bearer ${token}` } });
        toast.success(`Product ${productForm.id ? 'updated' : 'created'} successfully`);
        setShowProductForm(false);
        fetchAllProducts();
    } catch (err) { toast.error("Operation failed"); }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
        const token = localStorage.getItem("accessToken");
        await axios.delete(`/api/products/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        toast.success("Product deleted");
        fetchAllProducts();
    } catch (err) { toast.error("Delete failed"); }
  };

  const openAddProduct = () => {
    setProductForm({ id: null, name: "", description: "", price: "", category: "", stock: "", imageUrl: "", imageUrl2: "", activeIngredient: "" });
    setShowProductForm(true);
  };

  const openEditProduct = (p) => {
    setProductForm({ ...p });
    setShowProductForm(true);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex bg-white p-1 rounded-[1.25rem] border border-slate-100 shadow-sm w-fit">
        {[
          { id: "merchants", label: "Sellers Review", icon: <FileBadge size={14} />, badge: pendingSellers.length },
          { id: "inventory-review", label: "Inventory Review", icon: <Package size={14} />, badge: pendingProducts.length },
          { id: "all-products", label: "All Products", icon: <Layers size={14} /> },
          { id: "orders", label: "Sales Orders", icon: <Truck size={14} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 text-xs font-black rounded-xl transition-all ${
              activeSubTab === tab.id ? "bg-teal-600 text-white shadow-lg shadow-teal-100" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab.icon} {tab.label}
            {tab.badge > 0 && <span className="bg-rose-500 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px] tabular-nums">{tab.badge}</span>}
          </button>
        ))}
      </div>

      {activeSubTab === "merchants" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pendingSellers.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-slate-100">
                    <FileBadge className="mx-auto text-slate-200 mb-4" size={48} />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No pending merchant applications</p>
                </div>
            ) : (
                pendingSellers.map(s => (
                    <div key={s.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">{s.organizationName}</h3>
                                <p className="text-xs font-mono text-teal-600 bg-teal-50 px-2 py-1 rounded inline-block mt-1 uppercase tracking-tighter">DL: {s.drugLicenseNumber}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pharmacist</p>
                                <p className="text-[11px] font-bold text-slate-700">{s.pharmacistName}</p>
                                <p className="text-[10px] font-black text-slate-400">#{s.pharmacistRegNum}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
                             <div>
                                <p className="text-[10px] text-slate-400 font-black uppercase mb-1">GST/Tax ID</p>
                                <p className="text-xs font-bold text-slate-700">{s.gstTaxId}</p>
                             </div>
                             <div>
                                <p className="text-[10px] text-slate-400 font-black uppercase mb-1">IEC Code</p>
                                <p className="text-xs font-bold text-slate-700">{s.iecCode}</p>
                             </div>
                        </div>

                        <div className="flex gap-4">
                            {s.gmpCertificationUrl && (
                                <a href={`/api/admin/download?path=${s.gmpCertificationUrl}`} className="flex-1 flex items-center justify-center gap-2 p-3 bg-slate-50 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-100">
                                    <Eye size={12} /> View GMP
                                </a>
                            )}
                            {s.smfUrl && (
                                <a href={`/api/admin/download?path=${s.smfUrl}`} className="flex-1 flex items-center justify-center gap-2 p-3 bg-slate-50 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-100">
                                    <Eye size={12} /> View SMF
                                </a>
                            )}
                        </div>

                        <button 
                            onClick={() => handleModeration('seller', s.id, true)}
                            className="w-full bg-slate-900 text-white py-4 rounded-xl font-black shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 text-xs uppercase"
                        >
                            Approve Manufacturing Seller
                        </button>
                    </div>
                ))
            )}
        </div>
      )}

      {activeSubTab === "inventory-review" && (
        <div className="space-y-6">
            {pendingProducts.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-3xl border border-slate-100">
                    <Package className="mx-auto text-slate-200 mb-4" size={48} />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No inventory submissions waiting</p>
                </div>
            ) : (
                pendingProducts.map(p => (
                    <div key={p.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 flex flex-col lg:flex-row gap-10">
                        <div className="w-full lg:w-48 space-y-3">
                            <div className="aspect-square bg-slate-50 rounded-2xl border border-slate-50 overflow-hidden">
                                {p.imageUrl && <img src={p.imageUrl} className="w-full h-full object-cover" />}
                            </div>
                            <div className="aspect-square bg-slate-50 rounded-2xl border border-slate-50 overflow-hidden">
                                {p.imageUrl2 && <img src={p.imageUrl2} className="w-full h-full object-cover" />}
                            </div>
                        </div>

                        <div className="flex-1 space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900">{p.name}</h3>
                                    <p className="text-xs font-black text-teal-600 uppercase tracking-widest mt-1">{p.category} | Active: {p.activeIngredient}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-black text-slate-900">₹{p.price}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Listed Price</p>
                                </div>
                            </div>

                            <p className="text-sm text-slate-500 font-medium leading-relaxed">{p.description}</p>

                            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verify Units:</p>
                                <input 
                                    type="number" 
                                    defaultValue={p.stock}
                                    onBlur={(e) => handleStockUpdate(p.id, e.target.value)}
                                    className="w-24 bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-black focus:border-teal-600 outline-none"
                                />
                                <span className="text-[10px] font-black text-teal-600 uppercase">Available In Stock</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 justify-center">
                            <button 
                                onClick={() => handleModeration('product', p.id, 'ACTIVE')}
                                className="bg-teal-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all active:scale-95 text-xs uppercase"
                            >
                                Approve Listing
                            </button>
                            <button 
                                onClick={() => handleModeration('product', p.id, 'REJECTED')}
                                className="bg-rose-50 text-rose-600 border border-rose-100 px-8 py-4 rounded-2xl font-black hover:bg-rose-100 transition-all active:scale-95 text-xs uppercase"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
      )}

      {activeSubTab === "all-products" && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-900">Global Inventory</h2>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Direct Catalog Management</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-72 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="text" placeholder="Search product ID or name..." className="w-full bg-slate-50 border border-slate-100 pl-12 pr-4 py-3 rounded-2xl text-xs font-bold focus:bg-white focus:border-teal-600 outline-none transition-all" />
                    </div>
                    <button 
                        onClick={openAddProduct}
                        className="bg-teal-600 text-white p-3 rounded-2xl shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all active:scale-95"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allProducts.map(p => (
                    <div key={p.id} className="p-6 rounded-3xl border border-slate-50 bg-slate-50/20 hover:border-teal-100 hover:bg-teal-50/10 transition-all group">
                        <div className="flex gap-4 items-center mb-4">
                            <div className="w-20 h-20 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-1 flex items-center justify-center">
                                {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover rounded-xl" /> : <Package className="text-slate-200" />}
                            </div>
                            <div className="flex-1 truncate">
                                <h4 className="font-black text-slate-900 truncate">{p.name}</h4>
                                <p className="text-[10px] font-black text-teal-600 uppercase tracking-tighter">{p.category}</p>
                                <p className="text-lg font-black text-slate-900">₹{p.price}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                             <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    defaultValue={p.stock}
                                    onBlur={(e) => handleStockUpdate(p.id, e.target.value)}
                                    className="w-16 bg-white border border-slate-200 px-2 py-1 rounded-lg text-xs font-black"
                                />
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${p.stock > 10 ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {p.stock > 0 ? 'Units' : 'Out'}
                                </span>
                             </div>
                             <div className="flex gap-1">
                                <button 
                                    onClick={() => openEditProduct(p)}
                                    className="p-2 text-slate-400 hover:text-teal-600 hover:bg-white rounded-lg transition-all"
                                >
                                    <ArrowUpRight size={14} />
                                </button>
                                <button 
                                    onClick={() => handleDeleteProduct(p.id)}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
                                >
                                    <XCircle size={14} />
                                </button>
                             </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {activeSubTab === "orders" && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-900">Order Logs</h2>
                <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase cursor-not-allowed"><ClipboardList size={16} /> Total: {orders.length}</div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-50">
                            <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Tracking</th>
                            <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Inventory Manifest</th>
                            <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Transaction</th>
                            <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Flow State</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {orders.map(o => (
                            <tr key={o.id} className="hover:bg-slate-50/30 transition-colors">
                                <td className="p-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl"><Truck size={20} /></div>
                                        <div>
                                            <p className="font-black text-slate-900 text-sm">#{o.id}</p>
                                            <p className="text-[10px] font-bold text-slate-400">USER: {o.userId}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-8">
                                    <div className="space-y-1">
                                        {o.items.map(item => (
                                            <div key={item.id} className="text-xs font-bold text-slate-600 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                                {item.quantity}x {item.productName}
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="p-8">
                                    <div className="flex items-center gap-1.5 text-slate-900 font-black mb-1"><IndianRupee size={14} /> {o.totalAmount}</div>
                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${o.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                                        {o.paymentStatus}
                                    </span>
                                </td>
                                <td className="p-8 text-right">
                                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest inline-block mb-3 ${
                                        o.status === 'DELIVERED' ? 'bg-slate-900 text-white' : 'bg-white border-2 border-slate-100 text-slate-500'
                                    }`}>
                                        {o.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}
      {/* PRODUCT MODAL */}
      {showProductForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-10 relative animate-in zoom-in-95 duration-200">
            <button 
                onClick={() => setShowProductForm(false)}
                className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition-colors"
            >
                <XCircle size={24} />
            </button>

            <h3 className="text-3xl font-black text-slate-900 mb-8">{productForm.id ? 'Edit Manifest' : 'New Catalog Item'}</h3>

            <form onSubmit={handleProductSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Common Name</label>
                    <input 
                        required
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-900 focus:bg-white focus:border-teal-600 outline-none transition-all"
                        placeholder="e.g. Ashwagandha Gold Capsules"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Item Description</label>
                    <textarea 
                        required
                        rows="3"
                        value={productForm.description}
                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-900 focus:bg-white focus:border-teal-600 outline-none transition-all resize-none"
                        placeholder="A comprehensive breakdown of efficacy..."
                    />
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Active Ingredient</label>
                    <input 
                        required
                        value={productForm.activeIngredient}
                        onChange={(e) => setProductForm({ ...productForm, activeIngredient: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-900 focus:bg-white focus:border-teal-600 outline-none transition-all"
                        placeholder="e.g. Withania Somnifera (2.5%)"
                    />
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Commercial Category</label>
                    <input 
                        required
                        value={productForm.category}
                        onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-900 focus:bg-white focus:border-teal-600 outline-none transition-all"
                        placeholder="AYURVEDIC / SUPPLEMENT"
                    />
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Inventory Stock</label>
                    <input 
                        required
                        type="number"
                        value={productForm.stock}
                        onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-900 focus:bg-white focus:border-teal-600 outline-none transition-all"
                    />
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Market Price (₹)</label>
                    <input 
                        required
                        type="number"
                        step="0.01"
                        value={productForm.price}
                        onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-900 focus:bg-white focus:border-teal-600 outline-none transition-all"
                    />
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Primary Identity Image (URL)</label>
                    <input 
                        value={productForm.imageUrl}
                        onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-900 focus:bg-white focus:border-teal-600 outline-none transition-all"
                    />
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Supportive Context Image (URL)</label>
                    <input 
                        value={productForm.imageUrl2}
                        onChange={(e) => setProductForm({ ...productForm, imageUrl2: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-900 focus:bg-white focus:border-teal-600 outline-none transition-all"
                    />
                </div>

                <div className="md:col-span-2 pt-4">
                    <button 
                        type="submit"
                        className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl shadow-slate-100 hover:bg-slate-800 transition-all active:scale-95 text-sm uppercase tracking-widest"
                    >
                        {productForm.id ? 'Save Deployment Changes' : 'Initialize Direct Catalog Release'}
                    </button>
                    <button 
                        type="button"
                        onClick={() => setShowProductForm(false)}
                        className="w-full mt-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                        Abort Modification
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

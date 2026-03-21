import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import { getAllRequests } from "../services/requestService";
import { getDocumentsForPractitioner } from "../services/documentService";
import { getAllProducts, createProduct, updateProduct, deleteProduct, getAllOrders, updateOrderStatus } from "../services/orderService";
import { getAllSessions } from "../services/sessionService";
import { getReports, resolveReport } from "../services/forumService";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("practitioners");

  // Practitioners State
  const [practitioners, setPractitioners] = useState([]);
  const [selectedPractitioner, setSelectedPractitioner] = useState(null);
  const [practitionersLoading, setPractitionersLoading] = useState(true);
  const [practitionersError, setPractitionersError] = useState(null);
  const [practitionerSearchTerm, setPractitionerSearchTerm] = useState("");
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Sessions/Requests State
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);

  // Products State
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: "", description: "", price: "", category: "", stock: "", imageUrl: "" });

  // Orders State
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // Forum Reports State
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  useEffect(() => {
    fetchPractitioners();
    fetchSessions();
    fetchProducts();
    fetchOrders();
    fetchReports();

    // Real-time polling
    const intervalId = setInterval(() => {
      if (activeTab === "products") fetchProducts();
      if (activeTab === "orders") fetchOrders();
      if (activeTab === "sessions") fetchSessions();
      if (activeTab === "reports") fetchReports();
    }, 10000);

    const handleFocus = () => {
      fetchPractitioners();
      fetchSessions();
      fetchProducts();
      fetchOrders();
      fetchReports();
    };

    window.addEventListener("focus", handleFocus);
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [activeTab]);

  // --- Fetchers ---
  const fetchPractitioners = async () => {
    try {
      setPractitionersLoading(true);
      const token = localStorage.getItem("accessToken");
      const response = await axios.get("/api/practitioners", {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      const mappedPractitioners = response.data.map((practitioner) => ({
        id: practitioner.id,
        fullName: practitioner.userName,
        email: practitioner.email,
        specialization: practitioner.specialization ?? "Not provided",
        qualifications: practitioner.qualifications ?? "Not provided",
        experience: practitioner.experience ?? "Not provided",
        consultationFee: practitioner.consultationFee,
        status: practitioner.verified ? "approved" : (practitioner.verificationStatus === "REJECTED" ? "rejected" : "pending"),
        verificationStatus: practitioner.verificationStatus || "PENDING_VERIFICATION",
        submittedDate: practitioner.createdAt
          ? new Date(practitioner.createdAt).toLocaleDateString()
          : new Date().toLocaleDateString(),
        createdAt: practitioner.createdAt,
      }));
      setPractitioners(mappedPractitioners);
      setPractitionersError(null);
    } catch (err) {
      console.error("Error fetching practitioners:", err);
      setPractitionersError("Failed to load practitioners.");
      setPractitioners([]);
    } finally {
      setPractitionersLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const sessionsData = await getAllSessions();
      setSessions(sessionsData || []);
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const data = await getAllProducts();
      setProducts(data);
    } catch (err) {
      console.error("Error fetching products:", err);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const ordersData = await getAllOrders();
      setOrders(ordersData || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      setReportsLoading(true);
      const data = await getReports();
      setReports(data || []);
    } catch (err) {
      console.error("Error fetching reports:", err);
      setReports([]);
    } finally {
      setReportsLoading(false);
    }
  };

  const handleResolveReport = async (reportId) => {
    try {
      await resolveReport(reportId);
      fetchReports();
    } catch (err) {
      alert("Failed to resolve report.");
    }
  };

  // --- Practitioners Logic ---
  useEffect(() => {
    if (selectedPractitioner && activeTab === "practitioners") {
      const fetchDocuments = async () => {
        try {
          setDocumentsLoading(true);
          const docs = await getDocumentsForPractitioner(selectedPractitioner.id);
          setDocuments(docs || []);
        } catch (err) {
          console.error("Error fetching documents:", err);
          setDocuments([]);
        } finally {
          setDocumentsLoading(false);
        }
      };
      fetchDocuments();
    } else {
      setDocuments([]);
    }
  }, [selectedPractitioner, activeTab]);

  const filteredPractitioners = practitioners.filter(
    (p) =>
      p.fullName.toLowerCase().includes(practitionerSearchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(practitionerSearchTerm.toLowerCase()) ||
      p.specialization.toLowerCase().includes(practitionerSearchTerm.toLowerCase())
  );

  const handleApprove = async (id) => {
    try {
      const token = localStorage.getItem("accessToken");
      await axios.put(`/api/practitioners/${id}/verify`, {}, { params: { verified: true }, headers: { Authorization: `Bearer ${token}` } });
      setPractitioners((prev) => prev.map((p) => (p.id === id ? { ...p, status: "approved" } : p)));
      setSelectedPractitioner(null);
    } catch (err) {
      alert("Failed to approve practitioner");
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return alert("Please provide a reason for rejection.");
    try {
      const token = localStorage.getItem("accessToken");
      await axios.put(`/api/practitioners/${rejectTargetId}/verify`, {}, { params: { verified: false, rejectionReason: rejectionReason.trim() }, headers: { Authorization: `Bearer ${token}` } });
      setPractitioners((prev) => prev.map((p) => (p.id === rejectTargetId ? { ...p, status: "rejected" } : p)));
      setSelectedPractitioner(null);
      setShowRejectModal(false);
      setRejectTargetId(null);
      setRejectionReason("");
    } catch (err) {
      alert("Failed to reject practitioner");
    }
  };

  // --- Products Logic ---
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  const handleProductFormChange = (e) => setProductForm({ ...productForm, [e.target.name]: e.target.value });

  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm({ name: "", description: "", price: "", category: "", stock: "", imageUrl: "" });
    setShowProductForm(true);
  };

  const openEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({ name: product.name, description: product.description || "", price: product.price, category: product.category || "", stock: product.stock, imageUrl: product.imageUrl || "" });
    setShowProductForm(true);
  };

  const handleProductSubmit = async () => {
    if (!productForm.name || !productForm.price || productForm.stock === "") return alert("Name, price, and stock are required.");
    try {
      const data = { name: productForm.name, description: productForm.description, price: parseFloat(productForm.price), category: productForm.category, stock: parseInt(productForm.stock), imageUrl: productForm.imageUrl || null };
      if (editingProduct) await updateProduct(editingProduct.id, data);
      else await createProduct(data);
      setShowProductForm(false);
      fetchProducts();
    } catch (err) {
      alert("Failed to save product.");
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteProduct(productId);
      fetchProducts();
    } catch (err) {
      alert("Failed to delete product.");
    }
  };

  // --- Orders Logic ---
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      fetchOrders();
    } catch (error) {
      alert("Failed to update order status.");
    }
  };

  // --- UI Helpers ---
  const handleLogout = () => {
    localStorage.removeItem("adminLoggedIn");
    navigate("/login");
  };

  const getStatusColor = (status) => {
    switch (status) { case "approved": return "bg-green-100 text-green-800"; case "rejected": return "bg-red-100 text-red-800"; default: return "bg-yellow-100 text-yellow-800"; }
  };
  const getStatusIcon = (status) => {
    switch (status) { case "approved": return "✅"; case "rejected": return "❌"; default: return "⏳"; }
  };
  const getSessionStatusColor = (status) => {
    switch (status) { case "COMPLETED": return "bg-green-100 text-green-800"; case "CANCELLED": return "bg-red-100 text-red-800"; default: return "bg-blue-100 text-blue-800"; }
  };
  const getOrderStatusColor = (status) => {
    switch (status) { case "DELIVERED": return "bg-green-100 text-green-800"; case "CANCELLED": return "bg-red-100 text-red-800"; default: return "bg-blue-100 text-blue-800"; }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-[#1f6f66]">Admin Dashboard</h1>
            <div className="flex gap-4">

              <button 
                onClick={() => navigate('/community-forum')} 
                className="text-gray-600 hover:text-[#1f6f66] font-medium transition"
              >
                Community Forum
              </button>
            </div>
          </div>
          <button onClick={handleLogout} className="text-red-600 hover:text-red-800 font-semibold px-4 py-2 hover:bg-red-50 rounded transition">
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col">
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-8 shadow-inner overflow-x-auto">
          {["practitioners", "sessions", "products", "orders", "reports"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-6 text-sm font-bold rounded-md capitalize transition-all whitespace-nowrap ${
                activeTab === tab
                  ? "bg-white text-[#1f6f66] shadow-sm transform scale-[1.02]"
                  : "text-gray-600 hover:bg-gray-300 hover:text-gray-900"
              }`}
            >
              {tab === "practitioners" && "Practitioner Approvals"}
              {tab === "sessions" && "Patient Requests & Sessions"}
              {tab === "products" && "Product Management"}
              {tab === "orders" && "Product Requests"}
              {tab === "reports" && `Forum Reports${reports.filter(r => !r.resolved).length > 0 ? ` (${reports.filter(r => !r.resolved).length})` : ''}`}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 bg-white rounded-xl shadow p-6 min-h-[500px]">
          {/* TAB 1: PRACTITIONER APPROVALS */}
          {activeTab === "practitioners" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* List */}
              <div className="lg:col-span-1 border-r border-gray-200 pr-6">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-gray-800 mb-2">Practitioners</h2>
                  <input type="text" placeholder="Search..." value={practitionerSearchTerm} onChange={(e) => setPractitionerSearchTerm(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded focus:border-[#1f6f66] focus:ring-1 focus:ring-[#1f6f66] outline-none" />
                </div>
                <div className="max-h-[500px] overflow-y-auto pr-2 space-y-2">
                  {practitionersLoading ? <p className="text-gray-500 text-center">Loading...</p> : practitionersError ? <p className="text-red-500">{practitionersError}</p> : filteredPractitioners.length === 0 ? <p className="text-gray-500 text-center">No practitioners found.</p> :
                    filteredPractitioners.map((p) => (
                      <div key={p.id} onClick={() => setSelectedPractitioner(p)} className={`p-3 border rounded cursor-pointer hover:border-[#1f6f66] transition ${selectedPractitioner?.id === p.id ? "bg-teal-50 border-[#1f6f66]" : "border-gray-200"}`}>
                        <div className="flex justify-between items-center">
                          <div className="truncate pr-2">
                            <p className="font-semibold text-gray-900 truncate">{p.fullName}</p>
                            <p className="text-xs text-gray-500 truncate">{p.email}</p>
                          </div>
                          <span className={`${getStatusColor(p.status)} p-1 rounded-full`} title={p.status}>{getStatusIcon(p.status)}</span>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
              
              {/* Details */}
              <div className="lg:col-span-2">
                 {selectedPractitioner ? (
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                    <div className="border-b border-gray-200 pb-4 mb-4">
                      <h2 className="text-2xl font-bold text-gray-900">{selectedPractitioner.fullName}</h2>
                      <p className="text-gray-600 font-medium">{selectedPractitioner.specialization}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 mb-6">
                      <div><p className="text-xs text-gray-500 uppercase font-bold">Email</p><p className="text-gray-800">{selectedPractitioner.email}</p></div>
                      <div><p className="text-xs text-gray-500 uppercase font-bold">Experience</p><p className="text-gray-800">{selectedPractitioner.experience}</p></div>
                      <div><p className="text-xs text-gray-500 uppercase font-bold">Qualifications</p><p className="text-gray-800">{selectedPractitioner.qualifications}</p></div>
                      <div><p className="text-xs text-gray-500 uppercase font-bold">Fee</p><p className="text-gray-800">₹{selectedPractitioner.consultationFee}</p></div>
                      <div><p className="text-xs text-gray-500 uppercase font-bold">Status</p><p className="text-gray-800 capitalize">{selectedPractitioner.status}</p></div>
                      <div><p className="text-xs text-gray-500 uppercase font-bold">Submitted</p><p className="text-gray-800">{selectedPractitioner.submittedDate}</p></div>
                    </div>
                    
                    <div className="mb-6">
                      <h3 className="text-sm text-gray-500 uppercase font-bold mb-2">Documents</h3>
                      {documentsLoading ? <p className="text-sm text-gray-500">Loading...</p> : documents.length === 0 ? <p className="text-sm text-gray-500">No documents.</p> : (
                        <div className="space-y-2">
                          {documents.map(d => (
                            <div key={d.id} className="flex justify-between items-center bg-white p-2 border rounded">
                              <span className="text-sm truncate">{d.fileName}</span>
                              <a href={`/api/practitioners/documents/${d.id}/download`} target="_blank" rel="noreferrer" className="text-blue-600 text-xs font-bold px-2 py-1 bg-blue-50 rounded hover:bg-blue-100">View</a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {selectedPractitioner.status === "pending" && (
                      <div className="flex space-x-4 pt-4 border-t border-gray-200">
                        <button onClick={() => handleApprove(selectedPractitioner.id)} className="flex-1 bg-green-600 text-white font-bold py-2 rounded hover:bg-green-700">Approve</button>
                        <button onClick={() => { setRejectTargetId(selectedPractitioner.id); setShowRejectModal(true); }} className="flex-1 bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700">Reject</button>
                      </div>
                    )}
                  </div>
                 ) : (
                  <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                    <p className="text-gray-400">Select a practitioner to review details</p>
                  </div>
                 )}
              </div>
            </div>
          )}

          {/* TAB 2: PATIENT REQUESTS & SESSIONS */}
          {activeTab === "sessions" && (
            <div>
              <div className="mb-6 border-b border-gray-200 pb-4">
                <h2 className="text-2xl font-bold text-gray-800">Platform Sessions</h2>
                <p className="text-gray-500 text-sm">Overview of patient-practitioner appointments</p>
              </div>
              {sessionsLoading ? <p className="text-center text-gray-500 my-10">Loading sessions...</p> : sessions.length === 0 ? <p className="text-center text-gray-500 my-10">No sessions found.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                        <th className="p-4 rounded-tl-lg font-semibold">Date & Time</th>
                        <th className="p-4 font-semibold">Patient</th>
                        <th className="p-4 font-semibold">Practitioner</th>
                        <th className="p-4 font-semibold">Status</th>
                        <th className="p-4 rounded-tr-lg font-semibold text-right">Document</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sessions.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50 transition">
                          <td className="p-4">
                            <div className="font-medium text-gray-900">{new Date(s.sessionDate).toLocaleDateString()}</div>
                            <div className="text-xs text-gray-500">{s.startTime.slice(0,5)} - {s.endTime.slice(0,5)}</div>
                          </td>
                          <td className="p-4 font-medium text-gray-800">{s.userName}</td>
                          <td className="p-4 text-gray-600">{s.practitionerName}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${getSessionStatusColor(s.status)}`}>{s.status}</span>
                          </td>
                          <td className="p-4 text-right">
                            {s.status === "COMPLETED" && s.prescribedDocumentUrl ? (
                              <a href={`/api/sessions/${s.id}/document/download`} target="_blank" rel="noreferrer" className="text-blue-600 font-bold text-sm hover:underline">Download</a>
                            ) : <span className="text-gray-400 text-sm">-</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRODUCT MANAGEMENT */}
          {activeTab === "products" && (
            <div>
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Inventory Management</h2>
                  <p className="text-gray-500 text-sm">Add, edit, and track real-time stock</p>
                </div>
                <button onClick={openAddProduct} className="bg-[#1f6f66] hover:bg-[#155e57] text-white px-5 py-2.5 rounded-lg font-bold shadow transition">+ Add Product</button>
              </div>
              <input type="text" placeholder="Search products..." value={productSearchTerm} onChange={(e) => setProductSearchTerm(e.target.value)} className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded mb-6 focus:outline-none focus:ring-2 focus:ring-[#1f6f66]" />
              
              {productsLoading ? <p className="text-center text-gray-500 my-10">Loading products...</p> : filteredProducts.length === 0 ? <p className="text-center text-gray-500 my-10">No products found.</p> : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 text-sm uppercase">
                        <th className="p-4 font-semibold">Name</th>
                        <th className="p-4 font-semibold">Category</th>
                        <th className="p-4 font-semibold">Price</th>
                        <th className="p-4 font-semibold">Stock</th>
                        <th className="p-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredProducts.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="p-4 font-semibold text-gray-900">{p.name}</td>
                          <td className="p-4 text-gray-600">{p.category}</td>
                          <td className="p-4 font-bold text-[#1f6f66]">₹{p.price}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${p.stock > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{p.stock} units</span>
                          </td>
                          <td className="p-4 text-right space-x-3">
                            <button onClick={() => openEditProduct(p)} className="text-blue-600 font-bold text-sm hover:underline">Edit</button>
                            <button onClick={() => handleDeleteProduct(p.id)} className="text-red-600 font-bold text-sm hover:underline">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PRODUCT REQUESTS */}
          {activeTab === "orders" && (
            <div>
              <div className="mb-6 border-b border-gray-200 pb-4">
                <h2 className="text-2xl font-bold text-gray-800">Product Orders</h2>
                <p className="text-gray-500 text-sm">Manage user medicine requests and fulfillments</p>
              </div>
              {ordersLoading ? <p className="text-center text-gray-500 my-10">Loading orders...</p> : orders.length === 0 ? <p className="text-center text-gray-500 my-10">No orders found.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                        <th className="p-4 rounded-tl-lg font-semibold">User ID</th>
                        <th className="p-4 font-semibold">Products</th>
                        <th className="p-4 font-semibold">Total Price</th>
                        <th className="p-4 font-semibold">Payment</th>
                        <th className="p-4 font-semibold">Status</th>
                        <th className="p-4 rounded-tr-lg font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {orders.map(o => (
                        <tr key={o.id} className="hover:bg-gray-50 transition">
                          <td className="p-4 text-gray-600 font-medium">#{o.userId}</td>
                          <td className="p-4 text-sm text-gray-700">
                            {o.items.map(item => (
                              <div key={item.id}>{item.quantity}x {item.productName}</div>
                            ))}
                          </td>
                          <td className="p-4 font-bold text-gray-900">₹{o.totalAmount}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${o.paymentStatus === "PAID" ? "bg-green-100 text-green-800" : o.paymentStatus === "FAILED" ? "bg-red-100 text-red-800" : o.paymentStatus === "REFUNDED" ? "bg-gray-200 text-gray-800" : "bg-yellow-100 text-yellow-800"}`}>
                              {o.paymentStatus || "PENDING"}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${getOrderStatusColor(o.status)}`}>{o.status}</span>
                          </td>
                          <td className="p-4 text-right">
                            {o.status === "PLACED" ? (
                              <button onClick={() => handleUpdateOrderStatus(o.id, "SHIPPED")} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-bold shadow transition">Mark Shipped</button>
                            ) : o.status === "SHIPPED" ? (
                              <button onClick={() => handleUpdateOrderStatus(o.id, "DELIVERED")} className="bg-[#1f6f66] hover:bg-[#155e57] text-white px-3 py-1.5 rounded text-sm font-bold shadow transition">Mark Delivered</button>
                            ) : <span className="text-gray-400 font-bold text-sm bg-gray-100 px-3 py-1.5 rounded">Done</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: FORUM REPORTS */}
          {activeTab === "reports" && (
            <div>
              <div className="mb-6 border-b border-gray-200 pb-4">
                <h2 className="text-2xl font-bold text-gray-800">Forum Reports</h2>
                <p className="text-gray-500 text-sm">Review answers reported as Inaccurate, Dangerous, Spam, etc.</p>
              </div>
              {reportsLoading ? <p className="text-center text-gray-500 my-10">Loading reports...</p> : reports.length === 0 ? <p className="text-center text-gray-500 my-10">No reports found.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                        <th className="p-4 rounded-tl-lg font-semibold">Reported By</th>
                        <th className="p-4 font-semibold">Answer Author</th>
                        <th className="p-4 font-semibold">Answer Content</th>
                        <th className="p-4 font-semibold">Reason</th>
                        <th className="p-4 font-semibold">Date</th>
                        <th className="p-4 font-semibold">Status</th>
                        <th className="p-4 rounded-tr-lg font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {reports.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50 transition">
                          <td className="p-4 font-medium text-gray-800">{r.reporterName}</td>
                          <td className="p-4 text-gray-600">{r.answerAuthorName}</td>
                          <td className="p-4 text-gray-700 text-sm max-w-xs truncate" title={r.answerContent}>{r.answerContent?.substring(0, 80)}{r.answerContent?.length > 80 ? '...' : ''}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                              r.reason === 'Dangerous' ? 'bg-red-100 text-red-800' :
                              r.reason === 'Spam' ? 'bg-yellow-100 text-yellow-800' :
                              r.reason === 'Inaccurate' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>{r.reason}</span>
                          </td>
                          <td className="p-4 text-sm text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${r.resolved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {r.resolved ? 'Resolved' : 'Pending'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {!r.resolved ? (
                              <button onClick={() => handleResolveReport(r.id)} className="bg-[#1f6f66] hover:bg-[#155e57] text-white px-3 py-1.5 rounded text-sm font-bold shadow transition">Resolve</button>
                            ) : <span className="text-gray-400 font-bold text-sm bg-gray-100 px-3 py-1.5 rounded">Done</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Modals */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-2">Reject Application</h3>
            <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Reason..." rows={4} className="w-full border rounded p-3 mb-4 focus:ring-[#1f6f66] outline-none" />
            <div className="flex space-x-3">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 bg-gray-200 py-2 rounded font-bold">Cancel</button>
              <button onClick={handleReject} className="flex-1 bg-red-600 text-white py-2 rounded font-bold">Reject</button>
            </div>
          </div>
        </div>
      )}

      {showProductForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">{editingProduct ? "Edit" : "Add"} Product</h3>
            <div className="space-y-4 mb-6">
              <input type="text" name="name" value={productForm.name} onChange={handleProductFormChange} placeholder="Name" className="w-full border p-2 rounded focus:ring-[#1f6f66] outline-none" />
              <textarea name="description" value={productForm.description} onChange={handleProductFormChange} placeholder="Description" rows={2} className="w-full border p-2 rounded focus:ring-[#1f6f66] outline-none" />
              <div className="flex space-x-4">
                <input type="number" name="price" value={productForm.price} onChange={handleProductFormChange} placeholder="Price" className="w-full border p-2 rounded focus:ring-[#1f6f66] outline-none" />
                <input type="number" name="stock" value={productForm.stock} onChange={handleProductFormChange} placeholder="Stock" className="w-full border p-2 rounded focus:ring-[#1f6f66] outline-none" />
              </div>
              <input type="text" name="category" value={productForm.category} onChange={handleProductFormChange} placeholder="Category" className="w-full border p-2 rounded focus:ring-[#1f6f66] outline-none" />
              <input type="text" name="imageUrl" value={productForm.imageUrl} onChange={handleProductFormChange} placeholder="Image URL (e.g. https://...)" className="w-full border p-2 rounded focus:ring-[#1f6f66] outline-none" />
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setShowProductForm(false)} className="flex-1 bg-gray-200 py-2 rounded font-bold">Cancel</button>
              <button onClick={handleProductSubmit} className="flex-1 bg-[#1f6f66] text-white py-2 rounded font-bold">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

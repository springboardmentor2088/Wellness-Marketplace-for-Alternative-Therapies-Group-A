import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function SellerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('inventory');
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Product Form State
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    activeIngredient: '',
    description: '',
    price: '',
    stock: ''
  });
  const [img1, setImg1] = useState(null);
  const [img2, setImg2] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const response = await axios.get('/api/sellers/my-products', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      setProducts(response.data);
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const data = new FormData();
    data.append('product', JSON.stringify(newProduct));
    if (img1) data.append('img1', img1);
    if (img2) data.append('img2', img2);

    try {
      await axios.post('/api/sellers/products', data, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}` 
        }
      });
      toast.success('Product submitted for review!');
      setNewProduct({ name: '', category: '', activeIngredient: '', description: '', price: '', stock: '' });
      setImg1(null);
      setImg2(null);
      fetchProducts();
      setActiveTab('inventory');
    } catch (err) {
      toast.error('Failed to add product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-indigo-900">Seller Hub</h2>
          <p className="text-xs text-slate-400">Merchant Workspace</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`w-full text-left px-4 py-3 rounded-xl transition ${activeTab === 'inventory' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            📦 My Inventory
          </button>
          <button 
            onClick={() => setActiveTab('add')}
            className={`w-full text-left px-4 py-3 rounded-xl transition ${activeTab === 'add' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            ➕ List Product
          </button>
          <button 
            onClick={() => setActiveTab('wallet')}
            className={`w-full text-left px-4 py-3 rounded-xl transition ${activeTab === 'wallet' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            💰 Earnings Wallet
          </button>
          <button 
            onClick={() => navigate('/user/dashboard')}
            className="w-full text-left px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 mt-10"
          >
            ⬅️ Back to Patient UI
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        
        {activeTab === 'inventory' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-slate-900">My Products</h1>
              <button 
                onClick={() => setActiveTab('add')}
                className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
              >
                + New Product
              </button>
            </div>

            {loadingProducts ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100" />)}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
                <p className="text-slate-400 mb-4 text-4xl">💊</p>
                <h3 className="text-lg font-bold text-slate-800">No products listed yet</h3>
                <p className="text-slate-500">Start selling your medicines by listing your first product.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {products.map(product => (
                  <div key={product.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-6">
                    <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                      {product.imageUrl && <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900">{product.name}</h3>
                      <p className="text-sm text-slate-500">{product.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">₹{product.price}</p>
                      <p className={`text-xs font-bold uppercase ${product.moderationStatus === 'ACTIVE' ? 'text-green-500' : product.moderationStatus === 'REJECTED' ? 'text-red-500' : 'text-amber-500'}`}>
                        {product.moderationStatus}
                      </p>
                    </div>
                    <div className="pl-6 border-l border-slate-100 text-center">
                      <p className="text-xs text-slate-400 uppercase font-bold">Stock</p>
                      <p className="text-lg font-black text-slate-800">{product.stock}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'add' && (
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 mb-8">List New Product</h1>
            <form onSubmit={handleAddProduct} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Product Name</label>
                  <input 
                    type="text" required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Paracetamol 500mg"
                    value={newProduct.name}
                    onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Category</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newProduct.category}
                    onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                  >
                    <option value="">Select Category</option>
                    <option value="Painkillers">Painkillers</option>
                    <option value="Antibiotics">Antibiotics</option>
                    <option value="Vitamins">Vitamins</option>
                    <option value="Ayurvedic">Ayurvedic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Active Ingredients</label>
                  <input 
                    type="text" required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Paracetamol IP"
                    value={newProduct.activeIngredient}
                    onChange={e => setNewProduct({...newProduct, activeIngredient: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Details (Description)</label>
                  <textarea 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 h-24"
                    placeholder="Composition, safety warnings, dosage instructions..."
                    value={newProduct.description}
                    onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Price (₹)</label>
                  <input 
                    type="number" required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                    value={newProduct.price}
                    onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">No. of Items (Stock)</label>
                  <input 
                    type="number" required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                    value={newProduct.stock}
                    onChange={e => setNewProduct({...newProduct, stock: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Product Image 1</label>
                  <input 
                    type="file" 
                    onChange={e => setImg1(e.target.files[0])}
                    className="text-xs text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Product Image 2</label>
                  <input 
                    type="file" 
                    onChange={e => setImg2(e.target.files[0])}
                    className="text-xs text-slate-400"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-white hover:text-indigo-600 border-2 border-transparent hover:border-indigo-600 transition ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Product for Review'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'wallet' && (
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-8">Seller Wallet</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <p className="text-sm font-bold text-slate-400 uppercase mb-2">Total Earnings</p>
                <p className="text-4xl font-black text-slate-900">₹0.00</p>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <p className="text-sm font-bold text-slate-400 uppercase mb-2">Available Balance</p>
                <p className="text-4xl font-black text-indigo-600">₹0.00</p>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <p className="text-sm font-bold text-slate-400 uppercase mb-2">Pending Payouts</p>
                <p className="text-4xl font-black text-amber-500">₹0.00</p>
              </div>
            </div>
            
            <div className="bg-white rounded-3xl p-8 border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-6">Recent Transactions</h3>
              <div className="text-center py-12 text-slate-400">
                No transactions yet. Complete sales to see them here.
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

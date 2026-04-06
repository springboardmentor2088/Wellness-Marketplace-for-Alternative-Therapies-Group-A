import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getAllProducts, addToCart, searchProducts, getProductsByCategory, getCartItemCount } from "../services/orderService";
import ProductReviewsModal from "../components/ProductReviewsModal";
import AskYourFriend from "../components/AskYourFriend";
import UserHeader from "../components/UserHeader";

export default function ProductMarketplace() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [quantities, setQuantities] = useState({});
  const [detailsProduct, setDetailsProduct] = useState(null);
  const [reviewsProduct, setReviewsProduct] = useState(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const handleQuantityChange = (productId, val, maxStock) => {
    let num = parseInt(val) || 1;
    if (num < 1) num = 1;
    if (num > maxStock) num = maxStock;
    setQuantities(prev => ({ ...prev, [productId]: num }));
  };

  useEffect(() => {
    loadProducts();
    loadCartCount();
  }, []);

  const loadCartCount = async () => {
    const count = await getCartItemCount();
    setCartCount(count);
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getAllProducts();
      setProducts(data);
      setFilteredProducts(data);

      // Extract unique categories
      const uniqueCategories = [...new Set(data.map((p) => p.category))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim() === "") {
      setSelectedCategory("all");
      setFilteredProducts(products);
      return;
    }

    try {
      const results = await searchProducts(query);
      setFilteredProducts(results);
    } catch (error) {
      console.error("Error searching products:", error);
      toast.error("Search failed");
    }
  };

  const handleCategoryFilter = async (category) => {
    setSelectedCategory(category);
    setSearchQuery("");

    if (category === "all") {
      setFilteredProducts(products);
      return;
    }

    try {
      const categoryProducts = await getProductsByCategory(category);
      setFilteredProducts(categoryProducts);
    } catch (error) {
      console.error("Error filtering by category:", error);
      toast.error("Filter failed");
    }
  };

  const handleAddToCart = async (product) => {
    const qty = quantities[product.id] || 1;
    if (qty > product.stock) {
      toast.error(`Only ${product.stock} items in stock`);
      return;
    }
    try {
      await addToCart(product, qty);
      const count = await getCartItemCount();
      setCartCount(count);
      toast.success(`${qty}x ${product.name} added to cart!`);
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add product to cart (Ensure backend is restarted).");
    }
  };

  const handleBuyNow = (product) => {
    const qty = quantities[product.id] || 1;
    if (qty > product.stock) {
      toast.error(`Only ${product.stock} items in stock`);
      return;
    }
    navigate('/cart', {
      state: {
        buyNowItem: {
          productId: product.id,
          productName: product.name,
          category: product.category,
          price: product.price,
          quantity: qty,
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Unified Intelligent Marketplace Header (Smart Hub) */}
      <div className="mb-12 px-4">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-indigo-600/5 backdrop-blur-3xl border border-indigo-500/10 p-1 group">
          {/* Animated Glows */}
          <div className="absolute top-0 right-0 -mt-24 -mr-24 w-80 h-80 bg-cyan-400/20 blur-[120px] rounded-full animate-pulse transition-all duration-[3000ms]"></div>
          <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-80 h-80 bg-purple-500/20 blur-[120px] rounded-full animate-pulse transition-all duration-[3000ms] delay-1000"></div>
          
          <div className="relative px-8 py-8 md:py-10">
            {/* Top Hub Row: Brand | AI Action | Cart */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-10">
              
              {/* Left Column: Branding */}
              <div className="text-center md:text-left">
                <button 
                  onClick={() => navigate('/user/dashboard')}
                  className="text-indigo-600 hover:text-indigo-800 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-4 transition-all hover:gap-3"
                >
                  ← Back to Dashboard
                </button>
                <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter italic leading-tight mb-2">
                  Wellness <span className="text-indigo-600">Marketplace.</span>
                </h1>
                <p className="text-slate-500 text-sm font-medium">Explore our premium collection</p>
              </div>

              {/* Center Column: The AI Bridge */}
              <div className="flex-1 max-w-lg">
                <button
                  onClick={() => setIsAiModalOpen(true)}
                  className="w-full group/btn relative p-0.5 rounded-3xl overflow-hidden transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-xl shadow-indigo-500/10"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 animate-gradient-x"></div>
                  <div className="relative bg-slate-900 rounded-[1.4rem] px-6 py-5 flex items-center gap-5">
                     <span className="text-3xl transition-transform group-hover/btn:rotate-12 duration-500">🤖</span>
                     <div className="text-left border-l border-white/10 pl-5">
                       <div className="flex items-center gap-2 mb-1">
                        <span className="flex h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></span>
                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Intelligence Active</p>
                       </div>
                       <p className="text-white font-bold text-lg leading-tight uppercase tracking-tighter">Ask Your Friend</p>
                       <p className="text-white/40 text-[10px] italic">Scan Prescription or symptoms</p>
                     </div>
                  </div>
                </button>
              </div>

              {/* Right Column: Actions */}
              <div className="flex items-center gap-6">
                <button
                  onClick={() => navigate('/cart')}
                  className="bg-white/50 hover:bg-white backdrop-blur-xl text-slate-900 px-8 py-5 rounded-3xl font-black flex items-center gap-3 shadow-md border border-white transition-all hover:-translate-y-1 active:translate-y-0"
                >
                  <span className="text-2xl">🛒</span>
                  <div className="text-left">
                    <p className="text-[10px] uppercase tracking-widest opacity-60">My Cart</p>
                    <p className="text-lg leading-tight font-black">{cartCount > 0 ? `${cartCount} items` : 'Empty'}</p>
                  </div>
                </button>
                <UserHeader className="" />
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Search */}
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={handleSearch}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
        />

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => handleCategoryFilter(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
        >
          <option value="all">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition p-6"
            >
              {/* Product Image */}
              <div className="mb-4 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center" style={{ height: "180px" }}>
                {product.imageUrl && product.imageUrl.trim() ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="object-cover w-full h-full"
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                ) : null}
                <div className="flex flex-col items-center justify-center text-gray-400" style={{ display: product.imageUrl && product.imageUrl.trim() ? 'none' : 'flex' }}>
                  <span className="text-4xl">📷</span>
                  <span className="text-xs mt-1">No Image</span>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-800 mb-1">{product.name}</h3>
                <p className="text-sm text-gray-500">{product.category}</p>
              </div>

              <div className="flex justify-between items-center mb-4">
                <div>
                  <span className="text-2xl font-bold text-teal-600">₹{product.price}</span>
                </div>
                <div className="text-right">
                  {product.available ? (
                    <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                      In Stock ({product.stock})
                    </span>
                  ) : (
                    <span className="inline-block bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-semibold">
                      Out of Stock
                    </span>
                  )}
                </div>
              </div>

              {/* Details & Reviews Buttons */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setDetailsProduct(product)}
                  className="flex-1 border border-teal-600 text-teal-600 hover:bg-teal-50 py-2 rounded-lg font-semibold transition text-sm"
                >
                  📋 Details
                </button>
                <button
                  onClick={() => setReviewsProduct(product)}
                  className="flex-1 border border-amber-500 text-amber-600 hover:bg-amber-50 py-2 rounded-lg font-semibold transition text-sm"
                >
                  ⭐ Reviews
                </button>
              </div>

              {/* Quantity + Add to Cart + Buy Now */}
              <div className="flex gap-2 items-center">
                {product.available && product.stock > 0 && (
                  <input
                    type="number"
                    min="1"
                    max={product.stock}
                    value={quantities[product.id] || 1}
                    onChange={(e) => handleQuantityChange(product.id, e.target.value, product.stock)}
                    className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                )}
                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={!product.available && product.stock <= 0}
                  className={`flex-1 py-2 rounded-lg font-semibold transition ${
                    product.available || product.stock > 0
                      ? "bg-teal-600 text-white hover:bg-teal-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {product.available || product.stock > 0 ? "Add to Cart" : "Out of Stock"}
                </button>
                {(product.available || product.stock > 0) && (
                  <button
                    onClick={() => handleBuyNow(product)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold transition"
                  >
                    Buy Now
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No products found</p>
        </div>
      )}

      {/* Details Modal */}
      {detailsProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Product Details</h3>
              <button onClick={() => setDetailsProduct(null)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-4">
              {detailsProduct.imageUrl && detailsProduct.imageUrl.trim() && (
                <div className="rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center" style={{ height: "150px" }}>
                  <img src={detailsProduct.imageUrl} alt={detailsProduct.name} className="object-cover w-full h-full" />
                </div>
              )}
              {detailsProduct.imageUrl2 && detailsProduct.imageUrl2.trim() && (
                <div className="rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center" style={{ height: "150px" }}>
                  <img src={detailsProduct.imageUrl2} alt={detailsProduct.name} className="object-cover w-full h-full" />
                </div>
              )}
            </div>

            <div className="mb-4">
              <h4 className="text-lg font-bold text-gray-800 mb-1">{detailsProduct.name}</h4>
              <div className="flex gap-2 mb-2">
                <span className="inline-block bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-xs font-semibold">{detailsProduct.category}</span>
                {detailsProduct.activeIngredient && (
                  <span className="inline-block bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold">Active: {detailsProduct.activeIngredient}</span>
                )}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{detailsProduct.description || "No description available."}</p>
            </div>

            <div className="flex justify-between items-center border-t pt-4">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-teal-600">₹{detailsProduct.price}</span>
                <span className="text-[10px] text-gray-400 uppercase font-bold">Price per unit</span>
              </div>
              <div className="text-right">
                {detailsProduct.stock > 0 ? (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold block mb-1">In Stock ({detailsProduct.stock})</span>
                ) : (
                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-semibold block mb-1">Out of Stock</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reviews Modal */}
      {reviewsProduct && (
        <ProductReviewsModal product={reviewsProduct} onClose={() => setReviewsProduct(null)} />
      )}

      {/* AI Assistant Modal */}
      <AskYourFriend isOpen={isAiModalOpen} setIsOpen={setIsAiModalOpen} />
    </div>
  );
}

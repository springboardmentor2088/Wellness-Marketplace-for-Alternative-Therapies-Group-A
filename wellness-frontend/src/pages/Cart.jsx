import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getCart,
  removeFromCart,
  updateCartItemQuantity,
  clearCart,
  createOrder,
  getOrderSummary,
  calculateOrderSummary,
} from "../services/orderService";
import PaymentModal from "../components/PaymentModal";
import AddressModal from "../components/AddressModal";
import { getStoredUser } from "../services/authService";
import { updateUser } from "../services/userService";

const FREE_DELIVERY_THRESHOLD = 299;
const DELIVERY_FEE = 50;
const GST_DIVISOR = 1.18;
const GST_CATEGORIES = ["NUTRITION", "HERBAL", "SUPPLEMENT", "MASSAGE", "YOGA", "FITNESS"];
const isGstApplicable = (category) =>
  category && GST_CATEGORIES.some((k) => category.toUpperCase().includes(k));

export default function ShoppingCart() {
  const navigate = useNavigate();
  const location = useLocation();
  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const user = getStoredUser();

  // Buy Now mode: product passed via route state
  const [buyNowItem, setBuyNowItem] = useState(null);
  const isBuyNow = !!buyNowItem;

  // Multi-step state
  const [step, setStep] = useState("CART");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [backendSummary, setBackendSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Detect Buy Now from route state
  useEffect(() => {
    if (location.state?.buyNowItem) {
      setBuyNowItem(location.state.buyNowItem);
      setStep("PREVIEW");
      // Clear route state so refreshing doesn't re-trigger
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (!isBuyNow) loadCart();
  }, [isBuyNow]);

  const loadCart = async () => {
    try {
      const items = await getCart();
      setCartItems(items);
      calculateTotal(items);
    } catch (error) {
      console.error("Failed to load cart", error);
      toast.error("Failed to load cart");
    }
  };

  const calculateTotal = (items) => {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    setTotal(total);
  };

  const handleRemoveItem = async (productId) => {
    try {
      await removeFromCart(productId);
      await loadCart();
      toast.success("Item removed from cart");
    } catch (e) {
      toast.error("Failed to remove item");
    }
  };

  const handleUpdateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) {
      handleRemoveItem(productId);
      return;
    }
    try {
      await updateCartItemQuantity(productId, newQuantity);
      await loadCart();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to update quantity");
    }
  };

  // --- The items currently being checked out (cart items or buy now item) ---
  const checkoutItems = isBuyNow
    ? [buyNowItem]
    : cartItems;

  const checkoutTotal = isBuyNow
    ? buyNowItem.price * buyNowItem.quantity
    : total;

  // --- Local preview calculations ---
  const calcItemGst = (item) => {
    if (isGstApplicable(item.category)) {
      const itemTotal = item.price * item.quantity;
      return itemTotal - itemTotal / GST_DIVISOR;
    }
    return 0;
  };

  const previewGst = checkoutItems.reduce((sum, item) => sum + calcItemGst(item), 0);
  const previewDelivery = checkoutTotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const previewTotal = checkoutTotal + previewDelivery;
  const freeDeliveryGap = FREE_DELIVERY_THRESHOLD - checkoutTotal;

  // --- Step handlers ---
  const handleProceedToPreview = () => {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    setStep("PREVIEW");
  };

  const handleProceedToAddress = () => {
    setStep("ADDRESS");
  };

  const handleAddressConfirm = async (address, phone) => {
    setDeliveryAddress(address);
    setDeliveryPhone(phone);
    setStep("FINAL_SUMMARY");
    setSummaryLoading(true);
    try {
      let summary;
      if (isBuyNow) {
        // Buy Now: use POST /calculate with specific items
        summary = await calculateOrderSummary([{
          productId: buyNowItem.productId,
          quantity: buyNowItem.quantity,
        }]);
      } else {
        // Cart flow: use GET /summary (fetches from DB cart)
        summary = await getOrderSummary();
      }
      setBackendSummary(summary);
    } catch (err) {
      toast.error("Failed to load order summary. Please try again.");
      setStep("ADDRESS");
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleConfirmAndPay = async () => {
    setPlacing(true);
    try {
      // Update user profile in background
      if (user && user.id) {
        try {
          const updatedFields = {};
          if (deliveryAddress) updatedFields.address = deliveryAddress;
          if (deliveryPhone) updatedFields.phone = deliveryPhone;
          if (Object.keys(updatedFields).length > 0) {
            const updatedUser = await updateUser(user.id, updatedFields);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        } catch (profileErr) {
          console.warn("Failed to update profile gracefully:", profileErr);
        }
      }

      const items = isBuyNow
        ? [{ productId: buyNowItem.productId, quantity: buyNowItem.quantity }]
        : cartItems.map((item) => ({ productId: item.productId, quantity: item.quantity }));

      const order = await createOrder(items, deliveryAddress);
      if (!isBuyNow) await clearCart();
      setOrderData(order);
      setStep("PAYMENT");
      setShowPayment(true);
      toast.success("Order reserved! Please complete payment.");
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error(error.response?.data?.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  const goBack = () => {
    if (step === "PREVIEW" && isBuyNow) { navigate('/products'); return; }
    if (step === "PREVIEW") setStep("CART");
    else if (step === "ADDRESS") setStep("PREVIEW");
    else if (step === "FINAL_SUMMARY") setStep("ADDRESS");
  };

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => step === "CART" ? navigate('/products') : goBack()}
            className="text-teal-600 hover:text-teal-800 font-semibold flex items-center gap-2 mb-4"
          >
            ← {step === "CART" ? "Back to Marketplace" : "Back"}
          </button>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {step === "CART" && "Shopping Cart"}
            {step === "PREVIEW" && (isBuyNow ? "Buy Now — Order Preview" : "Order Preview")}
            {step === "FINAL_SUMMARY" && "Order Summary"}
          </h1>

          {/* Step Indicator */}
          {step !== "CART" && step !== "PAYMENT" && (
            <div className="flex items-center gap-2 mt-4">
              {["PREVIEW", "ADDRESS", "FINAL_SUMMARY"].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step === s ? "bg-teal-600 text-white" :
                    ["PREVIEW", "ADDRESS", "FINAL_SUMMARY"].indexOf(step) > i ? "bg-teal-100 text-teal-700" : "bg-gray-200 text-gray-500"
                  }`}>{i + 1}</div>
                  <span className={`text-xs font-semibold hidden sm:inline ${step === s ? "text-teal-700" : "text-gray-400"}`}>
                    {s === "PREVIEW" ? "Preview" : s === "ADDRESS" ? "Address" : "Confirm"}
                  </span>
                  {i < 2 && <div className="w-8 h-0.5 bg-gray-300" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ============ STEP: CART (only for cart flow, not Buy Now) ============ */}
        {step === "CART" && !isBuyNow && (
          <>
            {cartItems.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.productId} className="bg-white rounded-lg shadow p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">{item.productName}</h3>
                          <p className="text-sm text-gray-500">{item.category}</p>
                        </div>
                        <button onClick={() => handleRemoveItem(item.productId)} className="text-red-600 hover:text-red-800 font-semibold">Remove</button>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xl font-bold text-teal-600">₹{item.price}</span>
                        <div className="flex items-center border border-gray-300 rounded-lg">
                          <button onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)} className="px-3 py-2 text-gray-600 hover:bg-gray-100">−</button>
                          <span className="px-4 py-2 font-semibold">{item.quantity}</span>
                          <button onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)} className="px-3 py-2 text-gray-600 hover:bg-gray-100">+</button>
                        </div>
                        <span className="text-lg font-bold text-gray-800">₹{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-lg shadow p-6 h-fit">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Order Summary</h2>
                  <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
                    <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-semibold">₹{total.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span className="font-semibold">{previewDelivery === 0 ? <span className="text-green-600">FREE</span> : `₹${previewDelivery}`}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Tax</span><span className="font-semibold text-gray-500">Included</span></div>
                  </div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-2xl font-bold text-teal-600">₹{previewTotal.toFixed(2)}</span>
                  </div>
                  {freeDeliveryGap > 0 && (
                    <p className="text-xs text-orange-600 font-semibold mb-4 bg-orange-50 p-2 rounded-lg text-center">
                      Add ₹{freeDeliveryGap.toFixed(2)} more for <span className="text-green-700 font-bold">FREE delivery</span>
                    </p>
                  )}
                  <button onClick={handleProceedToPreview} className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700">
                    Proceed to Checkout
                  </button>
                  <button onClick={() => navigate("/products")} className="w-full mt-3 border border-teal-600 text-teal-600 py-3 rounded-lg font-semibold hover:bg-teal-50">
                    Continue Shopping
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500 text-lg mb-6">Your cart is empty</p>
                <button onClick={() => navigate("/products")} className="bg-teal-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-700">
                  Continue Shopping
                </button>
              </div>
            )}
          </>
        )}

        {/* ============ STEP: PREVIEW ============ */}
        {step === "PREVIEW" && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 flex items-center gap-2">
              <span className="text-amber-600 text-lg">⚠️</span>
              <span className="text-amber-800 text-sm font-semibold">Final amount will be calculated after address confirmation</span>
            </div>

            <h3 className="text-lg font-bold text-gray-700 mb-4">Items ({checkoutItems.length})</h3>
            <div className="divide-y divide-gray-100">
              {checkoutItems.map((item) => (
                <div key={item.productId} className="py-4 flex justify-between items-center">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{item.productName}</p>
                    <p className="text-xs text-gray-500">
                      {item.category}
                      {isGstApplicable(item.category)
                        ? <span className="ml-2 text-teal-600 font-bold">(18% GST Included)</span>
                        : <span className="ml-2 text-gray-400 font-bold">(GST: 0%)</span>
                      }
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Qty: {item.quantity} × ₹{item.price}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">₹{(item.price * item.quantity).toFixed(2)}</p>
                    {calcItemGst(item) > 0 && (
                      <p className="text-xs text-teal-600">(Incl. GST: ₹{calcItemGst(item).toFixed(2)})</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 mt-4 pt-4 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span className="font-semibold">₹{checkoutTotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">GST (Included in price)</span><span className="font-semibold text-teal-600">₹{previewGst.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery</span>
                <span className="font-semibold">
                  {previewDelivery === 0
                    ? <span className="text-green-600">FREE ✓</span>
                    : <span>₹{previewDelivery} <span className="text-xs text-gray-400 line-through ml-1">₹50</span></span>
                  }
                </span>
              </div>
              {freeDeliveryGap > 0 && (
                <p className="text-xs text-orange-600 font-semibold bg-orange-50 p-2 rounded text-center">
                  Add ₹{freeDeliveryGap.toFixed(2)} more for FREE delivery
                </p>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-3">
                <span>Estimated Total</span>
                <span className="text-teal-600">₹{previewTotal.toFixed(2)}</span>
              </div>
            </div>

            <button onClick={handleProceedToAddress} className="w-full mt-6 bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 text-lg">
              Continue to Address →
            </button>
          </div>
        )}

        {/* ============ STEP: ADDRESS (modal) ============ */}
        {step === "ADDRESS" && (
          <AddressModal
            currentAddress={user?.address || ""}
            currentPhone={user?.phone || ""}
            onConfirm={handleAddressConfirm}
            onClose={() => setStep("PREVIEW")}
          />
        )}

        {/* ============ STEP: FINAL_SUMMARY ============ */}
        {step === "FINAL_SUMMARY" && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            {summaryLoading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500 mx-auto mb-4" />
                <p className="text-gray-500 font-semibold">Calculating your order...</p>
              </div>
            ) : backendSummary ? (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 flex items-center gap-2">
                  <span className="text-green-600 text-lg">✅</span>
                  <span className="text-green-800 text-sm font-semibold">Final pricing confirmed by server</span>
                </div>

                <h3 className="text-lg font-bold text-gray-700 mb-4">Items ({backendSummary.items.length})</h3>
                <div className="divide-y divide-gray-100">
                  {backendSummary.items.map((item, i) => (
                    <div key={i} className="py-4 flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{item.productName}</p>
                        <p className="text-xs text-gray-500">
                          {item.category}
                          {isGstApplicable(item.category)
                            ? <span className="ml-2 text-teal-600 font-bold">(18% GST Included)</span>
                            : <span className="ml-2 text-gray-400 font-bold">(GST: 0%)</span>
                          }
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Qty: {item.quantity} × ₹{item.price}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800">₹{(item.price * item.quantity).toFixed(2)}</p>
                        {item.gstAmount > 0 && (
                          <p className="text-xs text-teal-600">(Incl. GST: ₹{item.gstAmount.toFixed(2)})</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 mt-4 pt-4 space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span className="font-semibold">₹{backendSummary.subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">GST (Included in price)</span><span className="font-semibold text-teal-600">₹{backendSummary.gstAmount.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery Charge</span>
                    <span className="font-semibold">
                      {backendSummary.deliveryCharge === 0 || backendSummary.deliveryCharge === 0.0
                        ? <span className="text-green-600 font-bold">FREE ✓</span>
                        : <span className="text-gray-800">₹{backendSummary.deliveryCharge.toFixed(2)}</span>
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-xl font-bold border-t border-gray-200 pt-4 mt-2">
                    <span>Total Payable</span>
                    <span className="text-teal-600">₹{backendSummary.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm font-bold text-gray-700 mb-1">📍 Delivering to:</p>
                  <p className="text-sm text-gray-600">{deliveryAddress}</p>
                </div>

                <button
                  onClick={handleConfirmAndPay}
                  disabled={placing}
                  className="w-full mt-6 bg-teal-600 hover:bg-teal-700 text-white py-4 rounded-lg font-bold text-lg disabled:opacity-50 transition-all shadow-lg"
                >
                  {placing ? "Placing Order..." : `Pay ₹${backendSummary.totalAmount.toFixed(2)}`}
                </button>
              </>
            ) : (
              <div className="text-center py-16">
                <p className="text-red-500 font-semibold">Failed to load summary. Please go back and try again.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showPayment && orderData && (
        <PaymentModal
          orderId={orderData.id}
          amount={orderData.totalAmount}
          onSuccess={() => {
            setShowPayment(false);
            navigate("/user/orders", { state: { orderId: orderData.id } });
          }}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}

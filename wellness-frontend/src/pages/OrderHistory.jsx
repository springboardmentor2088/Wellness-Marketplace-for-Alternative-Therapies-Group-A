import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getOrderHistory, getOrderById, cancelOrder, payForOrder } from "../services/orderService";
import ProductReviewFormModal from "../components/ProductReviewFormModal";
import UserHeader from "../components/UserHeader";

export default function OrderHistory() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);
  const [reviewItem, setReviewItem] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await getOrderHistory();
      setOrders(data);
    } catch (error) {
      console.error("Error loading orders:", error);
      toast.error("Failed to load order history");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = async (orderId) => {
    try {
      const order = await getOrderById(orderId);
      setSelectedOrder(order);
    } catch (error) {
      console.error("Error loading order details:", error);
      toast.error("Failed to load order details");
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) {
      return;
    }

    setCancelling(true);
    try {
      await cancelOrder(orderId, "User requested cancellation");
      toast.success("Order cancelled successfully");
      loadOrders();
      setSelectedOrder(null);
    } catch (error) {
      console.error("Error cancelling order:", error);
      const errorMsg = error.response?.data?.message || "Failed to cancel order";
      toast.error(errorMsg);
    } finally {
      setCancelling(false);
    }
  };

  const handlePayOrder = async (orderId) => {
    setPaying(true);
    try {
      await payForOrder(orderId);
      toast.success("Payment completed successfully!");
      loadOrders();
      await handleSelectOrder(orderId); // refresh details
    } catch (error) {
      console.error("Error paying order:", error);
      const errorMsg = error.response?.data?.message || "Payment failed";
      toast.error(errorMsg);
    } finally {
      setPaying(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      PLACED: "bg-blue-100 text-blue-800",
      SHIPPED: "bg-yellow-100 text-yellow-800",
      DELIVERED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getPaymentStatusBadgeColor = (status) => {
    const colors = {
      PENDING: "bg-orange-100 text-orange-800",
      PAID: "bg-green-100 text-green-800",
      FAILED: "bg-red-100 text-red-800",
      REFUNDED: "bg-purple-100 text-purple-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
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
      <div className="max-w-6xl mx-auto">
        <UserHeader />
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => navigate('/user/dashboard')}
            className="text-teal-600 hover:text-teal-800 font-semibold flex items-center gap-2 mb-4"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Pharmacy History</h1>
          <p className="text-gray-600">View and manage your previous pharmacy orders and assets</p>
        </div>

        {orders.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Orders List */}
            <div className="lg:col-span-2 space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => handleSelectOrder(order.id)}
                  className={`bg-white rounded-lg shadow p-6 cursor-pointer transition hover:shadow-lg ${
                    selectedOrder?.id === order.id ? "ring-2 ring-teal-600" : ""
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">Your Order</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(order.orderDate).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <div className="mt-2 text-sm text-slate-600 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-xs">
                        {order.items?.map(item => item.productName).join(", ")}
                      </div>
                      {order.deliveryAddress && (
                        <div className="mt-1 text-xs text-slate-500 italic flex items-start gap-1 max-w-xs">
                          <span className="shrink-0">📍</span>
                          <span className="truncate">{order.deliveryAddress}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-teal-600">₹{order.totalAmount}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(order.status)}`}>
                      {order.status}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPaymentStatusBadgeColor(order.paymentStatus)}`}>
                      {order.paymentStatus}
                    </span>
                  </div>

                  {(order.status === "PLACED" || order.status === "SHIPPED") && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelOrder(order.id);
                        }}
                        disabled={cancelling || paying}
                        className="text-sm text-red-600 font-bold hover:text-red-800 hover:underline transition-all flex items-center gap-1"
                      >
                        <span className="text-base">✕</span>
                        Cancel Order
                      </button>
                    </div>
                  )}

                  {order.status === "DELIVERED" && order.items && order.items.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                      {order.items.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setReviewItem(item);
                          }}
                          className="bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-700 transition flex items-center gap-1"
                        >
                          ⭐ Rate {item.productName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Order Details */}
            {selectedOrder && (
              <div className="bg-white rounded-lg shadow p-6 h-fit">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Order Details</h2>

                {/* Progress Stepper */}
                <div className="mb-8 px-2">
                  <div className="flex justify-between items-center relative">
                    {/* Progress Background Line */}
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2 z-0"></div>
                    <div 
                      className="absolute top-1/2 left-0 h-0.5 bg-teal-600 -translate-y-1/2 z-0 transition-all duration-500"
                      style={{ 
                        width: selectedOrder.status === 'DELIVERED' ? '100%' : 
                               selectedOrder.status === 'SHIPPED' ? '50%' : '0%' 
                      }}
                    ></div>

                    {/* Steps */}
                    {[
                      { label: 'Placed', status: 'PLACED' },
                      { label: 'Shipped', status: 'SHIPPED' },
                      { label: 'Delivered', status: 'DELIVERED' }
                    ].map((step, idx) => {
                      const isActive = selectedOrder.status === step.status || 
                                     (step.status === 'PLACED') ||
                                     (step.status === 'SHIPPED' && selectedOrder.status === 'DELIVERED');
                      const isCurrent = selectedOrder.status === step.status;

                      return (
                        <div key={idx} className="flex flex-col items-center relative z-10">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                            isActive ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'
                          } ${isCurrent ? 'ring-4 ring-teal-100' : ''}`}>
                            {isActive && selectedOrder.status !== step.status && step.status !== 'DELIVERED' ? '✓' : idx + 1}
                          </div>
                          <span className={`text-[10px] mt-2 font-bold uppercase tracking-wider ${
                            isActive ? 'text-teal-600' : 'text-gray-400'
                          }`}>
                            {step.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
                  <div>
                    <p className="text-sm text-gray-500">Order ID</p>
                    <p className="font-semibold">#{selectedOrder.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Order Date</p>
                    <p className="font-semibold">{new Date(selectedOrder.orderDate).toLocaleDateString()}</p>
                  </div>

                  {selectedOrder.estimatedDeliveryDate && (
                    <div className="pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-500">Estimated Delivery</p>
                      <p className="font-bold text-teal-600">
                        {new Date(selectedOrder.estimatedDeliveryDate).toLocaleDateString(undefined, { 
                          weekday: 'long', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  )}

                  {selectedOrder.deliveryAddress && (
                    <div className="pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-500">Delivery Address</p>
                      <p className="text-sm text-gray-600 italic leading-relaxed">
                        {selectedOrder.deliveryAddress}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className={`font-semibold ${getStatusBadgeColor(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Status</p>
                    <p className={`font-semibold ${getPaymentStatusBadgeColor(selectedOrder.paymentStatus)}`}>
                      {selectedOrder.paymentStatus}
                    </p>
                  </div>
                </div>

                <div className="mb-6 pb-6 border-b border-gray-200">
                  <h3 className="font-bold text-gray-800 mb-3">Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {item.productName} × {item.quantity}
                        </span>
                        <span className="font-semibold">₹{item.subtotal}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold">₹{selectedOrder.totalAmount}</span>
                  </div>
                  <div className="text-lg font-bold text-teal-600">
                    Total: ₹{selectedOrder.totalAmount}
                  </div>
                </div>

                <div className="flex gap-4">
                  {selectedOrder.paymentStatus === "PENDING" && selectedOrder.status !== "CANCELLED" && (
                    <button
                      onClick={() => handlePayOrder(selectedOrder.id)}
                      disabled={paying || cancelling}
                      className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition"
                    >
                      {paying ? "Processing..." : "Pay Now"}
                    </button>
                  )}

                  {(selectedOrder.status === "PLACED" || selectedOrder.status === "SHIPPED") && (
                    <button
                      onClick={() => handleCancelOrder(selectedOrder.id)}
                      disabled={cancelling || paying}
                      className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition"
                    >
                      {cancelling ? "Cancelling..." : "Cancel Order"}
                    </button>
                  )}
                </div>

                {/* Rate Product button for delivered orders */}
                {selectedOrder.status === "DELIVERED" && selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-bold text-gray-700 mb-2">Rate Your Products</h4>
                    <div className="space-y-2">
                      {selectedOrder.items.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => setReviewItem(item)}
                          className="w-full text-left bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg px-4 py-2 text-sm font-semibold text-amber-700 transition flex items-center gap-2"
                        >
                          ⭐ Rate {item.productName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg mb-6">No orders found</p>
            <button
              onClick={() => navigate("/products")}
              className="bg-teal-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-700"
            >
              Start Shopping
            </button>
          </div>
        )}
      </div>

      {/* Product Review Modal */}
      {reviewItem && (
        <ProductReviewFormModal
          product={reviewItem}
          onSuccess={() => {
            setReviewItem(null);
            toast.success("Thank you for your review!");
          }}
          onClose={() => setReviewItem(null)}
        />
      )}
    </div>
  );
}

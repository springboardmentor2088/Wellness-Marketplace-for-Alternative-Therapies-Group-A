import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getOrderHistory, getOrderById, cancelOrder } from "../services/orderService";

export default function OrderHistory() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Order History</h1>
          <p className="text-gray-600">View and manage your orders</p>
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
                      <h3 className="text-lg font-bold text-gray-800">Order #{order.id}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(order.orderDate).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
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
                </div>
              ))}
            </div>

            {/* Order Details */}
            {selectedOrder && (
              <div className="bg-white rounded-lg shadow p-6 h-fit">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Order Details</h2>

                <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
                  <div>
                    <p className="text-sm text-gray-500">Order ID</p>
                    <p className="font-semibold">#{selectedOrder.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Order Date</p>
                    <p className="font-semibold">
                      {new Date(selectedOrder.orderDate).toLocaleDateString("en-IN")}
                    </p>
                  </div>
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

                {(selectedOrder.status === "PLACED" || selectedOrder.status === "SHIPPED") && (
                  <button
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                    disabled={cancelling}
                    className="w-full bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
                  >
                    {cancelling ? "Cancelling..." : "Cancel Order"}
                  </button>
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
    </div>
  );
}

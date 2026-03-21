import { useState, useEffect } from "react";
import { initiatePayment, simulatePaymentWebhook, payWithWallet } from "../services/paymentService";
import { cancelOrder } from "../services/orderService";
import { getStoredUser } from "../services/authService";
import { getWalletBalance } from "../services/walletService";
import toast from "react-hot-toast";

export default function PaymentModal({ 
    sessionId, 
    orderId, 
    userId, 
    amount, 
    onSuccess, 
    onClose 
}) {
    const [loading, setLoading] = useState(false);
    const [walletBal, setWalletBal] = useState(0);
    const [paymentDetails, setPaymentDetails] = useState(null);
    const [initiationError, setInitiationError] = useState(null);
    const user = getStoredUser();
    const effectiveUserId = userId || user?.id || user?.data?.id;

    useEffect(() => {
        const preparePayment = async () => {
            setLoading(true);
            try {
                // Fetch wallet balance
                const balanceRes = await getWalletBalance();
                setWalletBal(balanceRes.balance || 0);

                // Initiate payment on backend to get orderId
                const orderData = await initiatePayment({
                    sessionId,
                    orderId,
                    userId: effectiveUserId,
                    amount
                });
                setPaymentDetails(orderData);
            } catch (err) {
                console.error("Payment initiation failed:", err);
                setInitiationError(err.response?.data?.error || "Failed to initiate payment.");
                toast.error("Failed to initiate payment.");
            } finally {
                setLoading(false);
            }
        };

        preparePayment();
    }, [sessionId, orderId, effectiveUserId, amount]);

    const handleWalletPay = async () => {
        setLoading(true);
        try {
            await payWithWallet({
                sessionId,
                orderId,
                userId: effectiveUserId,
                amount
            });
            toast.success("Payment successful using wallet!");
            onSuccess && onSuccess();
        } catch (err) {
            toast.error(err.response?.data?.error || "Wallet payment failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleOnlineSimulate = async () => {
        setLoading(true);
        try {
            await simulatePaymentWebhook({
                orderId: paymentDetails.orderId,
                paymentId: "mock_pay_" + Date.now(),
                signature: paymentDetails.signature || "mock_signature"
            });
            toast.success("Online payment successful!");
            onSuccess && onSuccess();
        } catch (err) {
            toast.error("Online payment simulation failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleCOD = () => {
        toast.success("Order confirmed with Cash on Delivery!");
        onSuccess && onSuccess();
    };

    const handleCancel = async () => {
        // We must use the internal database orderId (passed as prop) to cancel, NOT Razorpay's orderId
        if (!orderId && !sessionId) {
            onClose();
            return;
        }
        setLoading(true);
        try {
            if (orderId) {
                await cancelOrder(orderId, "Payment cancelled by user");
                toast.error("Order cancelled.");
            }
        } catch (err) {
            console.error("Failed to cancel order:", err);
            toast.error("Failed to cancel order.");
        } finally {
            setLoading(false);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Complete Payment</h2>
                        <p className="text-xs text-gray-500 mt-1">Order Ref: {orderId ? `#ORD-${orderId}` : `#SES-${sessionId}`}</p>
                    </div>
                    <button
                        onClick={handleCancel}
                        disabled={loading}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-8">
                    {initiationError ? (
                        <div className="text-center py-4">
                            <div className="text-red-500 text-5xl mb-4">⚠️</div>
                            <p className="text-gray-600 font-medium">{initiationError}</p>
                            <button 
                                onClick={handleCancel}
                                disabled={loading}
                                className="mt-6 w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition disabled:opacity-50"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 p-6 rounded-2xl text-center mb-8 border border-teal-100/50">
                                <p className="text-teal-600 text-sm font-semibold uppercase tracking-wider mb-2">Total Amount</p>
                                <p className="text-4xl font-black text-gray-900">₹{Number(amount).toFixed(2)}</p>
                                <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-teal-700 bg-white/60 py-1.5 px-3 rounded-full w-fit mx-auto border border-teal-100">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                    Wallet Balance: ₹{walletBal.toFixed(2)}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {walletBal >= amount ? (
                                    <button
                                        onClick={handleWalletPay}
                                        disabled={loading}
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-3 active:scale-[0.98]"
                                    >
                                        <span className="text-xl">💳</span>
                                        <span>Pay with Wallet (₹{walletBal.toFixed(2)})</span>
                                    </button>
                                ) : (
                                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                                        <div className="flex gap-3">
                                            <span className="text-xl">⚠️</span>
                                            <div>
                                                <p className="text-sm text-orange-800 font-bold">Insufficient Balance</p>
                                                <p className="text-xs text-orange-600 mt-0.5">Top up your wallet to use this method.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="relative flex items-center py-4">
                                    <div className="flex-grow border-t border-gray-100"></div>
                                    <span className="flex-shrink-0 mx-4 text-gray-300 text-xs font-bold tracking-widest uppercase">OR</span>
                                    <div className="flex-grow border-t border-gray-100"></div>
                                </div>

                                <button
                                    onClick={handleOnlineSimulate}
                                    disabled={loading || !paymentDetails}
                                    className="w-full py-4 bg-slate-900 hover:bg-black disabled:bg-gray-300 text-white rounded-2xl font-bold transition-all shadow-lg shadow-gray-200 flex items-center justify-center gap-3 active:scale-[0.98]"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span className="text-xl">🌐</span>
                                            <span>Pay Online (Simulate)</span>
                                        </>
                                    )}
                                </button>

                                { /* Conditional: Only show COD for product orders (when sessionId is absent) */ }
                                {!sessionId && (
                                    <button
                                        onClick={handleCOD}
                                        disabled={loading || !paymentDetails}
                                        className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white rounded-2xl font-bold transition-all shadow-lg shadow-amber-200 flex items-center justify-center gap-3 active:scale-[0.98]"
                                    >
                                        <span className="text-xl">💵</span>
                                        <span>Cash on Delivery (COD)</span>
                                    </button>
                                )}

                                <button
                                    onClick={handleCancel}
                                    disabled={loading}
                                    className="w-full py-4 text-gray-500 font-bold hover:text-gray-700 hover:bg-gray-50 rounded-2xl transition disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </>
                    )}
                </div>
                
                {/* Footer simple info */}
                <div className="p-4 bg-gray-50 text-center border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Secured by Wellness Gateway</p>
                </div>
            </div>
        </div>
    );
}

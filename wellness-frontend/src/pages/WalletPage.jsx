import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getAccessToken } from '../services/authService';

const WalletPage = () => {
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [amountToWithdraw, setAmountToWithdraw] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    useEffect(() => {
        fetchWalletData();
    }, [page]);

    const fetchWalletData = async () => {
        try {
            const userString = localStorage.getItem('user');
            if (!userString) return;
            const user = JSON.parse(userString);
            const token = getAccessToken();
            if (!token) return;

            const authHeaders = { headers: { 'Authorization': `Bearer ${token}` } };

            // Fetch balance
            const balanceResponse = await axios.get('/api/wallet/balance', authHeaders);
            setBalance(balanceResponse.data.balance);

            // Fetch paginated transactions
            const txResponse = await axios.get(`/api/wallet/transactions?page=${page}&size=10`, authHeaders);
            setTransactions(txResponse.data.content || []);
            setTotalPages(txResponse.data.totalPages || 0);

        } catch (error) {
            console.error("Failed to fetch wallet data", error);
            toast.error("Failed to load wallet data");
        } finally {
            setIsLoading(false);
        }
    };

    const handleWithdraw = async (e) => {
        e.preventDefault();
        const amt = parseFloat(amountToWithdraw);
        if (isNaN(amt) || amt <= 0 || amt > balance) {
            toast.error("Please enter a valid amount up to your balance");
            return;
        }

        setIsWithdrawing(true);
        try {
            const token = getAccessToken();
            await axios.post('/api/wallet/withdraw', {
                amount: amt,
                reason: 'USER_WITHDRAWAL'
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            toast.success("Withdrawal successful!");
            setAmountToWithdraw('');
            fetchWalletData();
        } catch (error) {
            console.error("Failed to withdraw funds", error);
            const msg = error.response?.data?.error || "Failed to withdraw funds";
            toast.error(msg);
        } finally {
            setIsWithdrawing(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Loading wallet data...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900">My Wallet</h2>
                <p className="text-slate-600 text-sm mt-2">Manage your funds and view transaction history</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Balance Card */}
                <div className="bg-gradient-to-br from- emerald-500 to-teal-600 text-white p-6 rounded-2xl shadow-lg">
                    <h3 className="text-lg font-medium opacity-90 mb-2">Available Balance</h3>
                    <div className="text-4xl font-bold border-b border-white/20 pb-4 mb-4">
                        ₹{balance.toFixed(2)}
                    </div>
                </div>

                {/* Withdraw Funds */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Withdraw Funds</h3>
                    <form onSubmit={handleWithdraw} className="flex gap-3">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                            <input
                                type="number"
                                min="1"
                                max={balance}
                                step="0.01"
                                placeholder="0.00"
                                value={amountToWithdraw}
                                onChange={(e) => setAmountToWithdraw(e.target.value)}
                                className="w-full pl-8 pr-4 py-2 hover:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-lg border border-slate-300"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isWithdrawing || balance <= 0}
                            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {isWithdrawing ? 'Processing...' : 'Withdraw'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 border-solid">
                    <h3 className="text-lg font-semibold text-slate-800">Transaction History</h3>
                </div>

                {transactions.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No transactions found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                                    <th className="px-6 py-3 font-medium">Date</th>
                                    <th className="px-6 py-3 font-medium">Type</th>
                                    <th className="px-6 py-3 font-medium">Description</th>
                                    <th className="px-6 py-3 font-medium text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactions.map((tx) => {
                                    const isCredit = tx.type === 'DEPOSIT' || tx.type === 'REFUND';
                                    return (
                                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {new Date(tx.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium 
                                                ${isCredit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-700">
                                            {tx.description}
                                        </td>
                                        <td className={`px-6 py-4 text-sm font-semibold text-right
                                            ${isCredit ? 'text-green-600' : 'text-slate-800'}`}>
                                            {isCredit ? '+' : '-'}₹{Number(tx.amount).toFixed(2)}
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-slate-50 border-solid">
                        <button
                            disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-sm disabled:opacity-50 hover:bg-slate-100 transition-colors"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-slate-600">
                            Page {page + 1} of {totalPages}
                        </span>
                        <button
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage(p => p + 1)}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-sm disabled:opacity-50 hover:bg-slate-100 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WalletPage;

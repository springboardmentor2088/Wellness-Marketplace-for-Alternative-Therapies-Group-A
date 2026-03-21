import React, { useState, useEffect } from 'react';
import { getWalletBalance } from '../services/walletService';

const WalletWidget = () => {
    const [balance, setBalance] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const data = await getWalletBalance();
                setBalance(data.balance);
            } catch (err) {
                console.error("Failed to fetch wallet balance", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBalance();
        const interval = setInterval(fetchBalance, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-full font-semibold shadow-md mr-4 cursor-pointer hover:shadow-lg transition-all" title="Wallet Balance">
            <span className="text-lg">💳</span>
            <span>{isLoading ? '...' : `₹${balance.toFixed(2)}`}</span>
        </div>
    );
};

export default WalletWidget;

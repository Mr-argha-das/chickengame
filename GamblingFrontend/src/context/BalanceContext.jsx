import { createContext, useContext, useState, useEffect } from 'react';
import { fetchBalance } from '../services/currentBalance'; // Your axios fetch
import { getStoredUser } from '../utils/storage';

const BalanceContext = createContext();

export const useBalance = () => useContext(BalanceContext);

export const BalanceProvider = ({ children }) => {
  const user = getStoredUser();
  const [balance, setBalance] = useState(0);

  const loadBalance = async () => {
    if (!user?._id) return;

    try {
      const data = await fetchBalance(user._id);
      setBalance(data.balance);
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  };

  // Fetch balance on mount
  useEffect(() => {
    if (user?._id) {
      loadBalance();
    }

    const handleFocus = () => {
      if (user?._id) {
        loadBalance();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user?._id]);

  return (
    <BalanceContext.Provider value={{ balance, setBalance, loadBalance }}>
      {children}
    </BalanceContext.Provider>
  );
};

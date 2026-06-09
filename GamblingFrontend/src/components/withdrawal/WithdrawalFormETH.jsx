import { useState } from 'react';
import axiosInstance from '../../utils/axiosInstance';

const WithdrawalFormETH = () => {
  const [formData, setFormData] = useState({
    amount: '',
    walletAddress: '',
    email: '',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const amount = Number(formData.amount);
    if (!amount || amount <= 0) {
      setErrorMessage('Please enter a valid withdrawal amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      await axiosInstance.post('/api/v1/wallet/withraw', {
        amount,
        method: "Crypto",
        details: { ...formData, cryptoType: "ETH" },
        remarks: "Payment request for INR"
      });
      setSuccessMessage('Withdrawal request submitted. Admin approval ka wait karein.');
    } catch (error) {
      console.error('Error submitting withdrawal:', error);
      setErrorMessage(
        error?.response?.data?.message ||
          'Withdrawal submit nahi hua. Please login dobara karke try karein.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        name="amount"
        placeholder="Payout amount (ETH)"
        className="input"
        value={formData.amount}
        onChange={handleChange}
      />

      <input
        type="text"
        name="walletAddress"
        placeholder="ETH Wallet Address"
        className="input"
        value={formData.walletAddress}
        onChange={handleChange}
      />

      <input
        type="email"
        name="email"
        placeholder="Email"
        className="input"
        value={formData.email}
        onChange={handleChange}
      />

      {errorMessage && (
        <p className="rounded-md border border-[#9C1137] bg-[#3d1017] px-3 py-2 text-sm text-red-200">
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p className="rounded-md border border-green-700 bg-green-950 px-3 py-2 text-sm text-green-200">
          {successMessage}
        </p>
      )}

      <button type="submit" disabled={isSubmitting} className="w-full cursor-pointer bg-gradient-to-b shadow-xs shadow-[#9C1137] from-[#9C1137] via-[#9C1137] to-black text-white py-2 rounded disabled:cursor-not-allowed disabled:opacity-60">
        {isSubmitting ? 'Submitting...' : 'Submit Withdrawal'}
      </button>
    </form>
  );
};

export default WithdrawalFormETH;

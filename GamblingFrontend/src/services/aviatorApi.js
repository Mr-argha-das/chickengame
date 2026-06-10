import axiosInstance from '../utils/axiosInstance';

export const getUserBets = (userId, limit = 50) =>
  axiosInstance.get(`/api/v1/aviator/user/${userId}/bets?limit=${limit}`);

export const getAllBets = (limit = 50) =>
  axiosInstance.get(`/api/v1/aviator/all-bets?limit=${limit}`);

export const placeAviatorBet = (amount) =>
  axiosInstance.post('/api/v1/aviator/bet', { amount });

export const cashOutAviatorBet = () =>
  axiosInstance.post('/api/v1/aviator/cashout');

export default axiosInstance;

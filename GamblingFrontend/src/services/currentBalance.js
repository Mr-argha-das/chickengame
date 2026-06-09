import axiosInstance from '../utils/axiosInstance';

export const fetchBalance = async (userId) => {
    try {
        const response = await axiosInstance.get(`/api/v1/users/balance/${userId}`);
        return response.data; // { balance: ... }
    } catch (error) {
        console.error('Error fetching balance:', error.response?.data || error.message);
        throw error;
    }
};

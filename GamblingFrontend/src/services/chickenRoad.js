import axiosInstance from "../utils/axiosInstance";


const startChickenGame = async ( userId, betAmount, difficulty) => {
  try {
    const response = await axiosInstance.post(`/api/v1/chicken-road/start`, {
      userId,
      gameType: 'chicken',
      betAmount: betAmount,
      difficulty
    });

    return response.data;
  } catch (error) {
    console.error('Error starting chicken game:', error.response?.data || error.message);
    throw error;
  }
};

const goToNextChickenStep = async () => {
  try {
    const response = await axiosInstance.post(`/api/v1/chicken-road/go`);

    return response.data;
  } catch (error) {
    console.error('Error moving chicken:', error.response?.data || error.message);
    throw error;
  }
};

const stopChickenGame = async ( userId, betAmount, payout ) => {
  try {
    const response = await axiosInstance.post(`/api/v1/chicken-road/stop`, {
      userId,
      betAmount,
      payout
    });

    return response.data;
  } catch (error) {
    console.error('Error starting chicken game:', error.response?.data || error.message);
    throw error;
  }
};

export {
    startChickenGame,
    goToNextChickenStep,
    stopChickenGame
}

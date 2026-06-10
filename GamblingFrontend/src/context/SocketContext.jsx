import { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { getCurrentRound } from '../services/colorAPI';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRound, setCurrentRound] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    const newSocket = io(`${import.meta.env.VITE_API_URL}`);

    const syncCurrentRound = async () => {
      try {
        const response = await getCurrentRound();
        const round = response.data?.data;
        if (!round) return;

        setCurrentRound({
          period: round.period,
          startTime: round.startTime,
          endTime: round.endTime,
          duration: Math.max(0, round.timeLeft) * 1000,
        });
        setTimeLeft(Math.max(0, round.timeLeft));
      } catch (error) {
        console.error('Failed to sync current color round:', error);
      }
    };

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
      syncCurrentRound();
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    newSocket.on('newRound', (roundData) => {
      setCurrentRound(roundData);
      setTimeLeft(roundData.duration / 1000);
      console.log('New round started:', roundData.period);
    });

    newSocket.on('countdown', (data) => {
      setTimeLeft(data.timeLeft);
    });

    newSocket.on('roundResult', (result) => {
      setLastResult(result);
      setCurrentRound(null);
      console.log('Round result:', result);
      setTimeout(syncCurrentRound, 5500);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const value = {
    socket,
    isConnected,
    currentRound,
    timeLeft,
    lastResult
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

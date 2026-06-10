import axiosInstance from "../utils/axiosInstance";

const startMineGame = (betAmount, mineCount) =>
  axiosInstance.post("/api/v1/mine/start", { betAmount, mineCount });

const revealMineTile = (tileIndex) =>
  axiosInstance.post("/api/v1/mine/reveal", { tileIndex });

const stopMineGame = () => axiosInstance.post("/api/v1/mine/stop");

export { revealMineTile, startMineGame, stopMineGame };

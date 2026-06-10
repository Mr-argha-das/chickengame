import { useEffect, useRef, useState } from "react";
import GameBoard from "../components/mines/GameBoard";
import { revealMineTile, startMineGame, stopMineGame } from "../services/mines";
import { useAuth } from "../context/AuthContext";
import BalanceButton from "../components/BalanceButton";
import { useBalance } from "../context/BalanceContext";
import WinPopup from "../components/chickenRoad/WinPopup";

function Mines() {
  const [gameState, setGameState] = useState("setup");
  const [mineCount, setMineCount] = useState(3);
  const [winAmount, SetWinAmount] = useState(0);
  const [currentMines, setCurrentMines] = useState([]);
  const [revealedTiles, setRevealedTiles] = useState([]);
  const [bet, setBet] = useState(10);
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [multiplier, setMultiplier] = useState(1.2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { user } = useAuth();
  const { balance, setBalance } = useBalance();

  const getBaseMultiplier = (nextMineCount = mineCount) =>
    Number((1 + 0.2 + 0.05 * (nextMineCount - 3)).toFixed(2));

  useEffect(() => {
    const audio = new Audio("/main.mp3");
    audio.loop = true; // Loop the sound
    audio.play().catch((err) => {
      console.error("Autoplay failed:", err);
    });

    return () => {
      audio.pause();
      audio.currentTime = 0; // Reset if needed
    };
  }, []);

  const startGame = async () => {
    const betAmount = Number(bet);
    if (!user?._id) {
      setErrorMessage("Please login again.");
      return;
    }

    if (!betAmount || betAmount < 10) {
      setErrorMessage("Minimum bet amount is 10.");
      return;
    }

    if (balance < bet) {
      setErrorMessage("Insufficient balance!");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      const response = await startMineGame(betAmount, mineCount);
      setGameState("playing");
      setRevealedTiles([]);
      setCurrentMines([]);
      setMultiplier(response.data?.data?.multiplier || getBaseMultiplier());
      if (typeof response.data?.data?.walletBalance === "number") {
        setBalance(response.data.data.walletBalance);
      }
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Failed to start game.");
      console.error("Failed to start mines game:", error?.response?.data || error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTileClick = async (index) => {
    if (gameState !== "playing" || isSubmitting) return;
    if (revealedTiles.includes(index)) return;

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      const response = await revealMineTile(index);
      const result = response.data?.data || {};

      if (result.hitMine) {
        const bombAudio = new Audio("/bomb.m4a"); // path relative to /public
        const loseAudio = new Audio("/lose.wav");

        bombAudio
          .play()
          .then(() => {
            bombAudio.onended = () => {
              loseAudio.play().catch((e) => {
                console.warn("Lose sound failed:", e);
              });
            };
          })
          .catch((e) => {
            console.warn("Fire sound failed:", e);
          });

        setCurrentMines(result.minePositions || []);
        setRevealedTiles((prev) => [...new Set([...prev, index, ...(result.minePositions || [])])]);
        setGameState("lost");
        SetWinAmount(0);
        setTimeout(() => {
          setShowWinPopup(true);
        }, 1000);
        return;
      }

      setRevealedTiles(result.revealedTiles || [...revealedTiles, index]);
      setMultiplier(result.multiplier || multiplier);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Failed to reveal tile.");
      console.error("Failed to reveal mines tile:", error?.response?.data || error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCashOut = async () => {
    if (isSubmitting || revealedTiles.length === 0) {
      setErrorMessage("Reveal at least one gem before cashing out.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      const response = await stopMineGame();
      const result = response.data?.data || {};
      const audio = new Audio("/win.wav");
      audio.play().catch((e) => {
        console.warn("Playback failed:", e);
      });

      const winnings = Number(result.payout || 0);
      if (typeof result.walletBalance === "number") {
        setBalance(result.walletBalance);
      }
      setMultiplier(result.multiplier || multiplier);
      setGameState("won");
      setShowWinPopup(true);
      SetWinAmount(winnings);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Cash out failed.");
      console.error("Failed to cash out mines game:", error?.response?.data || error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPotentialWin = () => {
    return bet * multiplier;
  };

  const resetGame = () => {
    setGameState("setup");
    setRevealedTiles([]);
    setCurrentMines([]);
    SetWinAmount(0);
    setMultiplier(getBaseMultiplier());
    setErrorMessage("");
  };

  const closePopup = () => {
    setShowWinPopup(false);
    resetGame();
  };

  const videoRef = useRef(null);
  const handleVideoEnd = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
    }
  };

  return (
    <div className="min-h-screen text-center flex flex-col gap-4 justify-between">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onEnded={handleVideoEnd}
        className="top-0 left-0 w-full h-screen fixed object-cover z-[-1]"
      >
        <source src="/hero.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <header className="bg-gray-800 text-white px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="text-2xl font-bold">MINES</div>

          {/* Stats */}
          <div className="text-start">
            <BalanceButton />
          </div>
        </div>
      </header>

      <GameBoard
        gameState={gameState}
        revealedTiles={revealedTiles}
        currentMines={currentMines}
        onTileClick={handleTileClick}
      />

      <div className="bg-gray-800 px-6 py-4 flex flex-col md:flex-row gap-4 items-center w-full justify-between">
        {/* Bet Controls */}
        <div className="flex items-center space-x-4">
          <div className="flex flex-col">
            <label className="text-xs text-gray-400 mb-1 text-start">
              Bet Amount
            </label>
            <input
              type="number"
              min={10}
              value={bet}
              onChange={(e) => setBet(parseFloat(e.target.value) || 0)}
              disabled={gameState === "playing"}
              className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-400 mb-1 text-start">
              Mines
            </label>
            <input
              type="number"
              min={3}
              max={24}
              value={mineCount}
              onChange={(e) => {
                const nextMineCount = Math.min(24, Math.max(3, Number(e.target.value)));
                setMineCount(nextMineCount);
                setMultiplier(getBaseMultiplier(nextMineCount));
              }}
              disabled={gameState !== "setup"}
              className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-400 mb-1 text-start">
              Gems
            </label>
            <span className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 text-start">
              {25 - mineCount}
            </span>
          </div>
        </div>

        <div className="flex md:flex-row flex-col-reverse items-center gap-4 md:gap-40">
          {/* Game Control Buttons */}
          <div className="flex items-center space-x-3">
            {gameState === "setup" && (
              <button
                onClick={startGame}
                disabled={isSubmitting}
                className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors font-semibold text-white"
              >
                <span>{isSubmitting ? "Starting..." : "Start Game"}</span>
              </button>
            )}

            {gameState === "playing" && (
              <>
                <button
                  onClick={() => handleCashOut()}
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors font-semibold text-white"
                >
                  <span>{isSubmitting ? "Please wait..." : "Cash Out"}</span>
                </button>
              </>
            )}

            {["gameOver", "lost", "won"].includes(gameState) && (
              <button
                onClick={resetGame}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors font-semibold text-white"
              >
                <span>New Game</span>
              </button>
            )}
          </div>

          {errorMessage && (
            <p className="text-sm font-semibold text-red-400">{errorMessage}</p>
          )}

          {/* Current Stats */}
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <p className="text-xs text-gray-400">Current Multiplier</p>
              <p className="text-lg font-bold text-green-400">{multiplier}x</p>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-400">Potential Win</p>
              <p className="text-lg font-bold text-yellow-400">
                ${getPotentialWin()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {showWinPopup && (
        <WinPopup
          winAmount={winAmount}
          multiplier={multiplier}
          betAmount={bet}
          gameState={gameState}
          onClose={closePopup}
        />
      )}
    </div>
  );
}

export default Mines;

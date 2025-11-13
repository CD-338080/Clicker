// components/Loading.tsx

/**
 * This project was developed by Nikandr Surkov.
 * You may not use this code if you purchased it from any source other than the official website https://nikandr.com.
 * If you purchased it from the official website, you may use it for your own projects,
 * but you may not resell it or publish it publicly.
 * 
 * Website: https://nikandr.com
 * YouTube: https://www.youtube.com/@NikandrSurkov
 * Telegram: https://t.me/nikandr_s
 * Telegram channel for news/updates: https://t.me/clicker_game_news
 * GitHub: https://github.com/nikandr-surkov
 */

'use client'

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { botUrlQr, mainCharacter } from '@/images';
import IceCube from '@/icons/IceCube';
import { calculateEnergyLimit, calculateLevelIndex, calculatePointsPerClick, calculateProfitPerHour, GameState, InitialGameState, useGameStore } from '@/utils/game-mechanics';
import WebApp from '@twa-dev/sdk';
import UAParser from 'ua-parser-js';
import { ALLOW_ALL_DEVICES } from '@/utils/consts';

interface LoadingProps {
  setIsInitialized: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentView: (view: string) => void;
}

export default function Loading({ setIsInitialized, setCurrentView }: LoadingProps) {
  const initializeState = useGameStore((state: GameState) => state.initializeState);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const openTimestampRef = useRef(Date.now());
  const [isAppropriateDevice, setIsAppropriateDevice] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const sendWelcomeMessage = async (telegramId: string, telegramName: string) => {
    try {
      // Only send message if we're not in development mode
      if (process.env.NEXT_PUBLIC_BYPASS_TELEGRAM_AUTH !== 'true') {
        const response = await fetch('/api/send-welcome', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            telegramId,
            telegramName
          }),
        });
        
        if (!response.ok) {
          console.error('Failed to send welcome message');
        }
      }
    } catch (error) {
      console.error('Error sending welcome message:', error);
      // We don't show an error to the user as this doesn't affect the main functionality
    }
  };

  const fetchOrCreateUser = useCallback(async () => {
    try {
      let initData, telegramId, username, telegramName, startParam;

      if (typeof window !== 'undefined') {
        const WebApp = (await import('@twa-dev/sdk')).default;
        WebApp.ready();
        WebApp.bottomBarColor = "#1d2025";
        WebApp.headerColor = "#000000";
        WebApp.enableVerticalSwipes();
        WebApp.expand();
        initData = WebApp.initData;
        telegramId = WebApp.initDataUnsafe.user?.id.toString();
        username = WebApp.initDataUnsafe.user?.username || 'Unknown User';
        telegramName = WebApp.initDataUnsafe.user?.first_name || 'Unknown User';

        startParam = WebApp.initDataUnsafe.start_param;
      }

      const referrerTelegramId = startParam ? startParam.replace('kentId', '') : null;

      if (process.env.NEXT_PUBLIC_BYPASS_TELEGRAM_AUTH === 'true') {
        initData = "temp";
        telegramId = "123456789"; // Temporary ID for testing
        telegramName = "Test User"; // Temporary name for testing
      }
      
      // Simulate loading progress
      const loadingInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 70) {
            clearInterval(loadingInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 300);
      
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramInitData: initData,
          referrerTelegramId,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch or create user');
      }
      const userData = await response.json();

      console.log("user data: ", userData);

      // Check if initData and telegramName are defined
      if (!initData) {
        throw new Error('initData is undefined');
      }
      if (!telegramName) {
        throw new Error('telegramName is undefined');
      }

      // Create the game store with fetched data
      const initialState: InitialGameState = {
        userTelegramInitData: initData,
        userTelegramName: telegramName,
        lastClickTimestamp: userData.lastPointsUpdateTimestamp,
        lastClickCooldownTimestamp: null,
        gameLevelIndex: calculateLevelIndex(userData.points),
        points: userData.points,
        pointsBalance: userData.pointsBalance,
        unsynchronizedPoints: 0,
        multitapLevelIndex: userData.multitapLevelIndex,
        pointsPerClick: calculatePointsPerClick(userData.multitapLevelIndex),
        energy: userData.energy,
        maxEnergy: calculateEnergyLimit(userData.energyLimitLevelIndex),
        energyRefillsLeft: userData.energyRefillsLeft,
        energyLimitLevelIndex: userData.energyLimitLevelIndex,
        lastEnergyRefillTimestamp: userData.lastEnergyRefillsTimestamp,
        mineLevelIndex: userData.mineLevelIndex,
        profitPerHour: calculateProfitPerHour(userData.mineLevelIndex),
        tonWalletAddress: userData?.tonWalletAddress,
      };

      console.log("Initial state: ", initialState);

      initializeState(initialState);

      // Send welcome message if we have the Telegram ID
      if (telegramId) {
        await sendWelcomeMessage(telegramId, telegramName);
      }
      
      // Complete the loading progress
      setLoadingProgress(100);
      
      // Set data as loaded
      setIsDataLoaded(true);
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Handle error (e.g., show error message to user)
    }
  }, [initializeState]);

  useEffect(() => {
    const parser = new UAParser();
    const device = parser.getDevice();
    const isAppropriate = ALLOW_ALL_DEVICES || device.type === 'mobile' || device.type === 'tablet';
    setIsAppropriateDevice(isAppropriate);

    if (isAppropriate) {
      fetchOrCreateUser();
    }
  }, [fetchOrCreateUser]);

  useEffect(() => {
    if (isDataLoaded) {
      const currentTime = Date.now();
      const elapsedTime = currentTime - openTimestampRef.current;
      const remainingTime = Math.max(3000 - elapsedTime, 0);

      const timer = setTimeout(() => {
        setCurrentView('game');
        setIsInitialized(true);
      }, remainingTime);

      return () => clearTimeout(timer);
    }
  }, [isDataLoaded, setIsInitialized, setCurrentView]);

  if (!isAppropriateDevice) {
    return (
      <div className="bg-black flex justify-center items-center h-screen">
        <div className="w-full max-w-xl text-white flex flex-col items-center">
          <h1 className="text-2xl font-bold mb-4 text-[#f3ba2f]">Play on your mobile</h1>
          <Image
            className="bg-[#1d2025] p-2 rounded-xl border border-[#43433b]"
            src={botUrlQr}
            alt="QR Code"
            width={200}
            height={200}
          />
          <p className="mt-4">@{process.env.NEXT_PUBLIC_BOT_USERNAME}</p>
          <p className="mt-2">Developed by Nikandr Surkov</p>
        </div>
      </div>
    );
  }

  // App palette
  const binanceYellow = "#f3ba2f";

  return (
    <div className="bg-black flex justify-center items-center h-screen overflow-hidden relative">
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#0a0a0a] to-[#1a1a1a] animate-gradient-shift" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#f3ba2f]/5 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#259073]/5 rounded-full blur-3xl animate-float-slow-reverse" />
      </div>

      <div className="w-full max-w-xl text-white flex flex-col items-center relative z-10">
        {/* Main character circle with enhanced animations */}
        <div className="w-64 h-64 rounded-full p-4 mb-8 relative z-10 animate-fade-in">
          {/* Rotating outer ring */}
          <div 
            className="absolute inset-0 rounded-full border-4 border-transparent"
            style={{
              background: `linear-gradient(${binanceYellow}40, ${binanceYellow}80, ${binanceYellow}40) padding-box,
                          linear-gradient(360deg, ${binanceYellow}, transparent, ${binanceYellow}) border-box`,
              animation: 'rotate-ring 3s linear infinite',
              mask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
              WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
              maskComposite: 'exclude',
              WebkitMaskComposite: 'xor'
            }}
          />
          
          <div 
            className="w-full h-full rounded-full overflow-hidden relative border-4 border-white/20 animate-pulse-glow"
            style={{
              boxShadow: `0 0 40px ${binanceYellow}60, inset 0 0 20px ${binanceYellow}20`
            }}
          >
            {/* Animated gradient overlay */}
            <div 
              className="absolute inset-0 opacity-30"
              style={{ 
                background: 'radial-gradient(circle, rgba(243,186,47,0.3) 0%, rgba(29,32,37,0.8) 70%)',
                animation: 'pulse-overlay 2s ease-in-out infinite'
              }} 
            />
            <Image
              src={mainCharacter}
              alt="Main Character"
              fill
              style={{
                objectFit: 'cover',
                objectPosition: 'center',
                transform: 'scale(1.05) translateY(10%)',
                animation: 'float-image 3s ease-in-out infinite'
              }}
              className="filter drop-shadow-glow-yellow relative z-10"
            />
          </div>
          
          {/* Glowing particles around circle */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: binanceYellow,
                boxShadow: `0 0 10px ${binanceYellow}`,
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-140px)`,
                animation: `orbit-particle ${2 + i * 0.2}s linear infinite`,
                opacity: 0.6
              }}
            />
          ))}
        </div>

        {/* Title with typing effect */}
        <h1 className="text-4xl font-bold mb-2 text-center relative z-10 animate-fade-in-up">
          <span 
            className="bg-gradient-to-r from-[#f3ba2f] via-[#f0b90b] to-[#f3ba2f] bg-clip-text text-transparent animate-shimmer"
            style={{
              backgroundSize: '200% auto',
              animation: 'shimmer 3s linear infinite'
            }}
          >
            Loading Clicker
          </span>
          <span className="inline-block animate-blink">...</span>
        </h1>
        
        <p className="text-center text-white/70 text-sm mb-6 relative z-10 animate-fade-in-up-delay">
          Preparing your clicker experience...
        </p>

        {/* Enhanced progress bar */}
        <div className="w-72 h-3 bg-[#43433b]/40 rounded-full mb-8 overflow-hidden relative z-10 shadow-lg animate-fade-in-up-delay-2">
          {/* Progress fill with animated gradient */}
          <div 
            className="h-full rounded-full relative overflow-hidden"
            style={{ 
              width: `${loadingProgress}%`,
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <div 
              className="absolute inset-0 bg-gradient-to-r from-[#f0b90b] via-[#f3ba2f] to-[#f0b90b]"
              style={{
                backgroundSize: '200% 100%',
                animation: 'progress-shimmer 2s linear infinite'
              }}
            />
            {/* Shine effect */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              style={{
                animation: 'progress-shine 1.5s ease-in-out infinite',
                transform: 'translateX(-100%)'
              }}
            />
          </div>
          
          {/* Progress percentage */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-white/80">
              {Math.round(loadingProgress)}%
            </span>
          </div>
        </div>

        {/* Enhanced ice cubes with better animations */}
        <div className="flex items-center space-x-3 relative z-10 animate-fade-in-up-delay-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="relative"
              style={{
                animation: `bounce-ice ${1.2 + index * 0.2}s ease-in-out infinite`,
                animationDelay: `${index * 0.1}s`,
                filter: `drop-shadow(0 0 ${8 + index * 2}px ${binanceYellow}${60 + index * 10})`
              }}
            >
              <div
                style={{
                  animation: `rotate-ice ${3 + index * 0.5}s linear infinite`,
                  display: 'inline-block'
                }}
              >
                <IceCube className="w-10 h-10" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced CSS Animations */}
      <style jsx global>{`
        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes float-slow {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translate(30px, -30px) scale(1.1);
            opacity: 0.5;
          }
        }

        @keyframes float-slow-reverse {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translate(-30px, 30px) scale(1.1);
            opacity: 0.5;
          }
        }

        @keyframes rotate-ring {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 30px ${binanceYellow}60, inset 0 0 20px ${binanceYellow}20;
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 50px ${binanceYellow}90, inset 0 0 30px ${binanceYellow}40;
            transform: scale(1.02);
          }
        }

        @keyframes pulse-overlay {
          0%, 100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.4;
          }
        }

        @keyframes float-image {
          0%, 100% {
            transform: scale(1.05) translateY(10%) rotate(0deg);
          }
          50% {
            transform: scale(1.08) translateY(8%) rotate(2deg);
          }
        }

        @keyframes orbit-particle {
          from {
            transform: translate(-50%, -50%) rotate(0deg) translateY(-140px) rotate(0deg);
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg) translateY(-140px) rotate(-360deg);
            opacity: 0.6;
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        @keyframes blink {
          0%, 50% {
            opacity: 1;
          }
          51%, 100% {
            opacity: 0;
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes progress-shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        @keyframes progress-shine {
          0% {
            transform: translateX(-100%);
          }
          50%, 100% {
            transform: translateX(200%);
          }
        }

        @keyframes bounce-ice {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-10px) scale(1.1);
          }
        }

        @keyframes rotate-ice {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-gradient-shift {
          animation: gradient-shift 8s ease infinite;
          background-size: 200% 200%;
        }

        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }

        .animate-float-slow-reverse {
          animation: float-slow-reverse 10s ease-in-out infinite;
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .animate-shimmer {
          animation: shimmer 3s linear infinite;
        }

        .animate-blink {
          animation: blink 1.5s ease-in-out infinite;
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out;
        }

        .animate-fade-in-up-delay {
          animation: fade-in-up 0.8s ease-out 0.2s both;
        }

        .animate-fade-in-up-delay-2 {
          animation: fade-in-up 0.8s ease-out 0.4s both;
        }

        .animate-fade-in-up-delay-3 {
          animation: fade-in-up 0.8s ease-out 0.6s both;
        }
        
        .filter.drop-shadow-glow-yellow {
          filter: drop-shadow(0 0 12px rgba(243, 186, 47, 0.5));
        }
      `}</style>
    </div>
  );
}
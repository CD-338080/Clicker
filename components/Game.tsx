// components/Game.tsx

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
import { binanceLogo, dailyCipher, dailyCombo, dailyReward, dollarCoin, lightning } from '@/images';
import IceCube from '@/icons/IceCube';
import IceCubes from '@/icons/IceCubes';
import Rocket from '@/icons/Rocket';
import Energy from '@/icons/Energy';
import Link from 'next/link';
import { useGameStore } from '@/utils/game-mechanics';
import Snowflake from '@/icons/Snowflake';
import TopInfoSection from '@/components/TopInfoSection';
import { LEVELS } from '@/utils/consts';
import { triggerHapticFeedback } from '@/utils/ui';

interface GameProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

const CLICK_COOLDOWN_MS = 60 * 1000; // 1 minuto en milisegundos

export default function Game({ currentView, setCurrentView }: GameProps) {

  const [isAnimationEnabled, setIsAnimationEnabled] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    const storedAnimation = localStorage.getItem('animationEnabled');
    setIsAnimationEnabled(storedAnimation !== 'false');
  }, []);

  const {
    points,
    pointsBalance,
    pointsPerClick,
    energy,
    maxEnergy,
    gameLevelIndex,
    clickTriggered,
    updateLastClickTimestamp,
    lastClickCooldownTimestamp,
    setLastClickCooldownTimestamp,
  } = useGameStore();

  // Calcular el tiempo restante del cooldown
  const calculateCooldownRemaining = useCallback(() => {
    if (lastClickCooldownTimestamp === null) return 0;
    const now = Date.now();
    const elapsed = now - lastClickCooldownTimestamp;
    return Math.max(0, CLICK_COOLDOWN_MS - elapsed);
  }, [lastClickCooldownTimestamp]);

  // Actualizar el tiempo restante del cooldown cada segundo
  useEffect(() => {
    const updateCooldown = () => {
      const remaining = calculateCooldownRemaining();
      setTimeRemaining(remaining);
    };

    // Actualizar inmediatamente
    updateCooldown();

    // Actualizar cada segundo
    const interval = setInterval(updateCooldown, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [calculateCooldownRemaining]);

  const handleViewChange = (view: string) => {
    console.log('Attempting to change view to:', view);
    if (typeof setCurrentView === 'function') {
      try {
        triggerHapticFeedback(window);
        setCurrentView(view);
        console.log('View change successful');
      } catch (error) {
        console.error('Error occurred while changing view:', error);
      }
    } else {
      console.error('setCurrentView is not a function:', setCurrentView);
    }
  };

  const [clicks, setClicks] = useState<{ id: number, x: number, y: number }[]>([]);

  const calculateTimeLeft = (targetHour: number) => {
    const now = new Date();
    const target = new Date(now);
    target.setUTCHours(targetHour, 0, 0, 0);

    if (now.getUTCHours() >= targetHour) {
      target.setUTCDate(target.getUTCDate() + 1);
    }

    const diff = target.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    const paddedHours = hours.toString().padStart(2, '0');
    const paddedMinutes = minutes.toString().padStart(2, '0');

    return `${paddedHours}:${paddedMinutes}`;
  };


  const handleInteraction = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent default behavior

    const processInteraction = (clientX: number, clientY: number, pageX: number, pageY: number) => {
      // Verificar si hay cooldown activo usando el store
      const remaining = calculateCooldownRemaining();
      if (remaining > 0) {
        // Aún está en cooldown, no procesar el click
        return;
      }

      if (energy - pointsPerClick < 0) return;

      const card = e.currentTarget;
      const rect = card.getBoundingClientRect();
      const x = clientX - rect.left - rect.width / 2;
      const y = clientY - rect.top - rect.height / 2;

      // Apply tilt effect
      card.style.transform = `perspective(1000px) rotateX(${-y / 10}deg) rotateY(${x / 10}deg)`;
      setTimeout(() => {
        card.style.transform = '';
      }, 100);

      // Registrar el tiempo del click exitoso en el store
      const clickTime = Date.now();
      setLastClickCooldownTimestamp(clickTime);
      setTimeRemaining(CLICK_COOLDOWN_MS);

      updateLastClickTimestamp();
      clickTriggered();
      if (isAnimationEnabled) {
        setClicks(prevClicks => [...prevClicks, {
          id: Date.now(),
          x: pageX,
          y: pageY
        }]);
      }

      triggerHapticFeedback(window);
    };

    if (e.type === 'touchend') {
      const touchEvent = e as React.TouchEvent<HTMLDivElement>;
      Array.from(touchEvent.changedTouches).forEach(touch => {
        processInteraction(touch.clientX, touch.clientY, touch.pageX, touch.pageY);
      });
    } else {
      const mouseEvent = e as React.MouseEvent<HTMLDivElement>;
      processInteraction(mouseEvent.clientX, mouseEvent.clientY, mouseEvent.pageX, mouseEvent.pageY);
    }
  };

  const handleAnimationEnd = (id: number) => {
    setClicks((prevClicks) => prevClicks.filter(click => click.id !== id));
  };

  const calculateProgress = () => {
    if (gameLevelIndex >= LEVELS.length - 1) {
      return 100;
    }
    const currentLevelMin = LEVELS[gameLevelIndex].minPoints;
    const nextLevelMin = LEVELS[gameLevelIndex + 1].minPoints;
    const progress = ((points - currentLevelMin) / (nextLevelMin - currentLevelMin)) * 100;
    return Math.min(progress, 100);
  };

  const formatTimeRemaining = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const isOnCooldown = timeRemaining > 0;

  return (
    <div className="bg-black flex justify-center min-h-screen">
      <div className="w-full bg-black text-white h-screen font-bold flex flex-col max-w-xl">
        <TopInfoSection isGamePage={true} setCurrentView={setCurrentView} />

        <div className="flex-grow mt-4 bg-[#f3ba2f] rounded-t-[48px] relative top-glow z-0">
          <div className="mt-[2px] bg-[#1d2025] rounded-t-[46px] h-full overflow-y-auto no-scrollbar">
            <div className="px-4 pt-1 pb-24">


              <div className="px-4 mt-4 flex justify-center">
                <div className="px-4 py-2 flex items-center space-x-2">
                  <IceCubes className="w-12 h-12 mx-auto" />
                  <p className="text-4xl text-white" suppressHydrationWarning >{Math.floor(pointsBalance).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex justify-center gap-2">
                <p>{LEVELS[gameLevelIndex].name}</p>
                <p className="text-[#95908a]" >&#8226;</p>
                <p>{gameLevelIndex + 1} <span className="text-[#95908a]">/ {LEVELS.length}</span></p>
              </div>

              <div className="px-4 mt-4 flex justify-center">
                <div className="relative">
                  <div
                    className={`w-80 h-80 p-4 rounded-full circle-outer ${isOnCooldown ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    onClick={handleInteraction}
                    onTouchEnd={handleInteraction}
                  >
                    <div className="w-full h-full rounded-full circle-inner overflow-hidden relative">
                      <Image
                        src={LEVELS[gameLevelIndex].bigImage}
                        alt="Main Character"
                        fill
                        style={{
                          objectFit: 'cover',
                          objectPosition: 'center',
                          transform: 'scale(1.05) translateY(10%)'
                        }}
                      />
                    </div>
                  </div>
                  {isOnCooldown && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/80 rounded-full px-6 py-3">
                        <p className="text-white text-2xl font-bold">
                          {formatTimeRemaining(timeRemaining)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between px-4 mt-4">
                <p className="flex justify-center items-center gap-1"><Image src={lightning} alt="Exchange" width={40} height={40} /><span className="flex flex-col"><span className="text-xl font-bold">{energy}</span><span className="text-base font-medium">/ {maxEnergy}</span></span></p>
                <button onClick={() => handleViewChange("boost")} className="flex justify-center items-center gap-1"><Rocket size={40} /><span className="text-xl">Boost</span></button>
              </div>

              <div className="w-full px-4 text-sm mt-2">
                <div className="flex items-center mt-1 border-2 border-[#43433b] rounded-full">
                  <div className="w-full h-3 bg-[#43433b]/[0.6] rounded-full">
                    <div className="progress-gradient h-3 rounded-full" style={{ width: `${calculateProgress()}%` }}></div>
                  </div>
                </div>
              </div>


            </div>
          </div>
        </div>
      </div>

      {clicks.map((click) => (
        <div
          key={click.id}
          className="absolute text-5xl font-bold opacity-0 text-white pointer-events-none flex justify-center"
          style={{
            top: `${click.y - 42}px`,
            left: `${click.x - 28}px`,
            animation: `float 1s ease-out`
          }}
          onAnimationEnd={() => handleAnimationEnd(click.id)}
        >
          {pointsPerClick}<IceCube className="w-12 h-12 mx-auto" />
        </div>
      ))}
    </div>
  )
}
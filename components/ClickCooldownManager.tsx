// components/ClickCooldownManager.tsx

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

import { useEffect } from 'react';
import { useGameStore } from '@/utils/game-mechanics';

const CLICK_COOLDOWN_MS = 60 * 1000; // 1 minuto en milisegundos

export function ClickCooldownManager() {
  const { lastClickCooldownTimestamp, setLastClickCooldownTimestamp } = useGameStore();

  useEffect(() => {
    // Si no hay cooldown activo, no hacer nada
    if (lastClickCooldownTimestamp === null) return;

    const checkCooldown = () => {
      // Obtener el estado actual del store dentro de la función
      const currentTimestamp = useGameStore.getState().lastClickCooldownTimestamp;
      if (currentTimestamp === null) return;
      
      const now = Date.now();
      const elapsed = now - currentTimestamp;
      
      // Si el cooldown ha terminado, limpiar el timestamp
      if (elapsed >= CLICK_COOLDOWN_MS) {
        setLastClickCooldownTimestamp(null);
      }
    };

    // Verificar inmediatamente
    checkCooldown();

    // Verificar cada segundo mientras hay cooldown activo
    const interval = setInterval(() => {
      checkCooldown();
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [lastClickCooldownTimestamp, setLastClickCooldownTimestamp]);

  return null;
}


// app/api/mine/route.ts

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

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { calculateLevelIndex } from '@/utils/game-mechanics';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

interface MineRequestBody {
  initData: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 100; // milliseconds
const POINTS_PER_MINUTE = 1;

export async function POST(req: Request) {
  try {
    const requestBody: MineRequestBody = await req.json();
    const { initData: telegramInitData } = requestBody;

    if (!telegramInitData) {
      return NextResponse.json({ error: 'Invalid request: missing telegramInitData' }, { status: 400 });
    }

    const { validatedData, user } = validateTelegramWebAppData(telegramInitData);

    if (!validatedData) {
      return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
    }

    const telegramId = user.id?.toString();

    if (!telegramId) {
      return NextResponse.json({ error: 'Invalid user data: missing telegramId' }, { status: 400 });
    }

    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        const result = await prisma.$transaction(async (prisma) => {
          const dbUser = await prisma.user.findUnique({
            where: { telegramId },
          });

          if (!dbUser) {
            throw new Error('User not found');
          }

          const currentTime = Date.now();
          const lastUpdateTime = dbUser.lastPointsUpdateTimestamp.getTime();
          
          // Verificar que haya pasado al menos 5 minutos desde la última actualización
          const timeSinceLastUpdate = currentTime - lastUpdateTime;
          const fiveMinutes = 300 * 1000; // 5 minutos en milisegundos
          
          if (timeSinceLastUpdate < fiveMinutes) {
            // Aún no han pasado 5 minutos
            return {
              success: true,
              message: 'Mining in progress',
              pointsAdded: 0,
              updatedPoints: dbUser.points,
              updatedPointsBalance: dbUser.pointsBalance,
              timeRemaining: fiveMinutes - timeSinceLastUpdate,
            };
          }

          // Actualizar puntos con optimistic locking
          const updatedUser = await prisma.user.update({
            where: {
              telegramId,
              lastPointsUpdateTimestamp: dbUser.lastPointsUpdateTimestamp, // Optimistic lock
            },
            data: {
              points: { increment: POINTS_PER_MINUTE },
              pointsBalance: { increment: POINTS_PER_MINUTE },
              lastPointsUpdateTimestamp: new Date(currentTime),
            },
          });

          const newLevelIndex = calculateLevelIndex(updatedUser.points);

          return {
            success: true,
            message: 'Points mined successfully',
            pointsAdded: POINTS_PER_MINUTE,
            updatedPoints: updatedUser.points,
            updatedPointsBalance: updatedUser.pointsBalance,
            newLevelIndex: newLevelIndex,
          };
        });

        return NextResponse.json(result);
      } catch (error) {
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2034') {
          // Optimistic locking failed, retry
          retries++;
          if (retries >= MAX_RETRIES) {
            throw new Error('Max retries reached for optimistic locking');
          }
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries))); // Exponential backoff
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    console.error('Error processing mine request:', error);
    return NextResponse.json({
      error: 'Failed to process mine request: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
}


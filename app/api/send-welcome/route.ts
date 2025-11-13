export const runtime = 'nodejs';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { telegramId, telegramName } = await req.json();
    
    if (!telegramId) {
      return NextResponse.json({ error: 'Missing telegramId' }, { status: 400 });
    }
    
    // Get the bot token from environment variables
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'BOT_TOKEN not configured' }, { status: 500 });
    }
    
    // Clicker game themed welcome message
    const welcomeMessage = `🎮 *Welcome ${telegramName}!* 🎯\n\n` +
      `Welcome to the Ultimate Clicker Game!\n\n` +
      `• Click to earn USDT and level up\n` +
      `• Upgrade your clicking power\n` +
      `• Compete with friends\n` +
      `• No lag, smooth gameplay 😉\n\n` +
      `Start clicking now! 🚀`;
    
    // Send the message using Telegram Bot API
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramId,
        text: welcomeMessage,
        parse_mode: 'Markdown'
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Telegram API error:', errorData);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending welcome message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 

export {};
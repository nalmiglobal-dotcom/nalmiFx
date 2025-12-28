/**
 * Candle Builder
 * 
 * Subscribes to tick events and aggregates them into OHLC candles.
 * Stores candles in memory (later: Redis/DB for persistence).
 * 
 * Flow:
 * tick event → update current candle → on bar close → emit candle:update → store completed candle
 */

import { eventBus, emitCandle } from './event-bus';
import type { Candle, Tick, Timeframe } from './models';

interface CandleKey {
  symbol: string;
  timeframe: Timeframe;
}

interface CurrentCandle extends Candle {
  tickCount: number;
}

// Timeframe durations in milliseconds
const TIMEFRAME_MS: Record<Timeframe, number> = {
  'M1': 60 * 1000,
  'M5': 5 * 60 * 1000,
  'M15': 15 * 60 * 1000,
  'M30': 30 * 60 * 1000,
  'H1': 60 * 60 * 1000,
  'H4': 4 * 60 * 60 * 1000,
  'D1': 24 * 60 * 60 * 1000,
};

function getCandleKey(symbol: string, timeframe: Timeframe): string {
  return `${symbol}:${timeframe}`;
}

function getCandleStartTime(time: number, timeframe: Timeframe): number {
  const duration = TIMEFRAME_MS[timeframe];
  return Math.floor(time / duration) * duration;
}

class CandleBuilder {
  private currentCandles = new Map<string, CurrentCandle>();
  private completedCandles = new Map<string, Candle[]>(); // Store last N candles per symbol/timeframe
  private maxStoredCandles = 500; // Keep last 500 bars per timeframe

  constructor() {
    // Subscribe to tick events
    eventBus.on('tick', (tick: Tick) => {
      this.processTick(tick);
    });
  }

  private processTick(tick: Tick): void {
    const { symbol, price, time } = tick;

    // Build candles for all active timeframes
    const timeframes: Timeframe[] = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'];

    for (const timeframe of timeframes) {
      this.updateCandle(symbol, timeframe, price, time);
    }
  }

  private updateCandle(symbol: string, timeframe: Timeframe, price: number, time: number): void {
    const key = getCandleKey(symbol, timeframe);
    const startTime = getCandleStartTime(time, timeframe);

    let currentCandle = this.currentCandles.get(key);

    // Check if we need to start a new candle
    if (!currentCandle || currentCandle.startTime !== startTime) {
      // Close previous candle if it exists
      if (currentCandle) {
        this.closeCandle(currentCandle);
      }

      // Start new candle
      currentCandle = {
        symbol,
        timeframe,
        open: price,
        high: price,
        low: price,
        close: price,
        startTime,
        tickCount: 1,
      };
      this.currentCandles.set(key, currentCandle);
    } else {
      // Update existing candle
      currentCandle.high = Math.max(currentCandle.high, price);
      currentCandle.low = Math.min(currentCandle.low, price);
      currentCandle.close = price;
      currentCandle.tickCount++;
    }
  }

  private closeCandle(candle: CurrentCandle): void {
    const key = getCandleKey(candle.symbol, candle.timeframe);

    // Store completed candle
    const stored = this.completedCandles.get(key) || [];
    stored.push({
      symbol: candle.symbol,
      timeframe: candle.timeframe,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      startTime: candle.startTime,
      volume: candle.tickCount,
    });

    // Keep only last N candles
    if (stored.length > this.maxStoredCandles) {
      stored.shift();
    }

    this.completedCandles.set(key, stored);

    // Emit candle update event
    emitCandle({
      symbol: candle.symbol,
      timeframe: candle.timeframe,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      startTime: candle.startTime,
      volume: candle.tickCount,
    });
  }

  getCandles(symbol: string, timeframe: Timeframe, limit: number = 100): Candle[] {
    const key = getCandleKey(symbol, timeframe);
    const stored = this.completedCandles.get(key) || [];
    return stored.slice(-limit);
  }

  getCurrentCandle(symbol: string, timeframe: Timeframe): Candle | null {
    const key = getCandleKey(symbol, timeframe);
    const current = this.currentCandles.get(key);
    if (!current) return null;

    return {
      symbol: current.symbol,
      timeframe: current.timeframe,
      open: current.open,
      high: current.high,
      low: current.low,
      close: current.close,
      startTime: current.startTime,
      volume: current.tickCount,
    };
  }

  clear(): void {
    this.currentCandles.clear();
    this.completedCandles.clear();
  }
}

// Singleton instance
export const candleBuilder = new CandleBuilder();


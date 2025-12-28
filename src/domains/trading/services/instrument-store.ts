/**
 * Instrument State Store
 * 
 * In-memory cache of all instrument prices (bid/ask/spread/time).
 * Subscribes to price:update events from the Price Stream Engine.
 * 
 * Later: Can be backed by Redis for multi-instance deployments.
 */

import { eventBus } from './event-bus';
import type { Instrument } from './models';

class InstrumentStore {
  private instruments = new Map<string, Instrument>();
  private lastUpdateTime = new Map<string, number>(); // Track when each symbol was last updated

  constructor() {
    // Subscribe to price updates
    eventBus.on('price:update', (data: any) => {
      this.updateInstrument(data);
    });
  }

  private updateInstrument(data: { symbol: string; bid: number; ask: number; spread: number; time: number }): void {
    const { symbol, bid, ask, spread, time } = data;
    
    // Always update - keep LAST KNOWN price even when market closes
    this.instruments.set(symbol, {
      symbol,
      bid,
      ask,
      spread,
      time,
    });
    
    this.lastUpdateTime.set(symbol, Date.now());
  }

  getInstrument(symbol: string): Instrument | null {
    return this.instruments.get(symbol) || null;
  }

  // Check if instrument price is stale (no updates in last 30 seconds = market likely closed)
  isStale(symbol: string): boolean {
    const lastUpdate = this.lastUpdateTime.get(symbol);
    if (!lastUpdate) return true;
    return Date.now() - lastUpdate > 30000; // 30 seconds = consider market closed
  }

  getInstrumentWithStatus(symbol: string): { instrument: Instrument | null; isLive: boolean } {
    const instrument = this.getInstrument(symbol);
    const isLive = instrument ? !this.isStale(symbol) : false;
    return { instrument, isLive };
  }

  getAllInstruments(): Instrument[] {
    return Array.from(this.instruments.values());
  }

  getInstrumentsBySymbols(symbols: string[]): Instrument[] {
    const result: Instrument[] = [];
    for (const symbol of symbols) {
      const inst = this.instruments.get(symbol);
      if (inst) result.push(inst);
    }
    return result;
  }

  hasInstrument(symbol: string): boolean {
    return this.instruments.has(symbol);
  }

  getSymbols(): string[] {
    return Array.from(this.instruments.keys());
  }

  clear(): void {
    this.instruments.clear();
  }
}

// Singleton instance
export const instrumentStore = new InstrumentStore();


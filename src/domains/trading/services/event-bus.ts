/**
 * Internal Event Bus
 * 
 * Simple event emitter for internal communication between trading engine components.
 * NOT exposed via REST API - only for server-side internal use.
 */

import { EventEmitter } from 'events';
import type { InternalEvent } from './models';

class TradingEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Allow many listeners
  }

  emit(eventName: string | symbol, ...args: any[]): boolean {
    return super.emit(eventName, ...args);
  }

  on(eventName: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(eventName, listener);
  }

  once(eventName: string | symbol, listener: (...args: any[]) => void): this {
    return super.once(eventName, listener);
  }

  off(eventName: string | symbol, listener: (...args: any[]) => void): this {
    return super.off(eventName, listener);
  }
}

// Singleton instance (server-side only)
export const eventBus = new TradingEventBus();

// Type-safe event emitters
export function emitPriceUpdate(symbol: string, bid: number, ask: number, time: number) {
  const spread = ask - bid;
  eventBus.emit('price:update', { symbol, bid, ask, spread, time });
}

export function emitTick(symbol: string, price: number, time: number) {
  eventBus.emit('tick', { symbol, price, time });
}

export function emitCandle(candle: any) {
  eventBus.emit('candle:update', candle);
}

export function emitTradeEvent(type: 'opened' | 'closed' | 'updated', trade: any) {
  eventBus.emit(`trade:${type}`, trade);
}


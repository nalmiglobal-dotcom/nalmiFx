"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

interface PriceData {
  symbol: string;
  bid: number;
  ask: number;
  time: string;
  spread?: number;
}

interface UsePriceStreamOptions {
  refreshInterval?: number;
}

/**
 * Hook to get real-time price for a single symbol
 */
export function usePrice(symbol: string, options?: UsePriceStreamOptions) {
  const [price, setPrice] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshInterval = options?.refreshInterval || 1000;

  useEffect(() => {
    if (!symbol) return;

    const fetchPrice = async () => {
      try {
        const res = await fetch(`/api/trading/price?symbol=${encodeURIComponent(symbol)}`);
        const data = await res.json();
        if (data.success && data.data) {
          setPrice(data.data);
          setError(null);
        }
      } catch (err) {
        // Don't set error for network issues, just keep last price
        console.error('Price fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, refreshInterval);
    return () => clearInterval(interval);
  }, [symbol, refreshInterval]);

  return { price, loading, error };
}

/**
 * Hook to get real-time prices for multiple symbols
 */
export function usePrices(symbols: string[], options?: UsePriceStreamOptions) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshInterval = options?.refreshInterval || 1000;

  useEffect(() => {
    if (!symbols || symbols.length === 0) return;

    const fetchPrices = async () => {
      try {
        const res = await fetch(`/api/trading/prices?symbols=${encodeURIComponent(symbols.join(','))}`);
        const data = await res.json();
        if (data.success && data.data) {
          const priceMap: Record<string, PriceData> = {};
          data.data.forEach((p: PriceData) => {
            priceMap[p.symbol] = p;
          });
          setPrices(priceMap);
          setError(null);
        }
      } catch (err) {
        console.error('Prices fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [symbols.join(','), refreshInterval]);

  return { prices, loading, error };
}

/**
 * Hook to get all available trading symbols
 */
export function useSymbols() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [specifications, setSpecifications] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const res = await fetch('/api/trading/symbols');
        const data = await res.json();
        if (data.success) {
          setSymbols(data.data?.symbols || []);
          setSpecifications(data.data?.specifications || {});
          setError(null);
        }
      } catch (err) {
        setError('Failed to fetch symbols');
        console.error('Symbols fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSymbols();
  }, []);

  return { symbols, specifications, loading, error };
}

import { useState, useEffect, useCallback, useRef } from 'react';

interface PriceData {
  symbol: string;
  bid: number;
  ask: number;
  time: string;
  spread?: number;
}

interface UsePriceStreamOptions {
  refreshInterval?: number;
}

/**
 * Hook to get real-time price for a single symbol
 */
export function usePrice(symbol: string, options?: UsePriceStreamOptions) {
  const [price, setPrice] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshInterval = options?.refreshInterval || 1000;

  useEffect(() => {
    if (!symbol) return;

    const fetchPrice = async () => {
      try {
        const res = await fetch(`/api/trading/price?symbol=${encodeURIComponent(symbol)}`);
        const data = await res.json();
        if (data.success && data.data) {
          setPrice(data.data);
          setError(null);
        }
      } catch (err) {
        // Don't set error for network issues, just keep last price
        console.error('Price fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, refreshInterval);
    return () => clearInterval(interval);
  }, [symbol, refreshInterval]);

  return { price, loading, error };
}

/**
 * Hook to get real-time prices for multiple symbols
 */
export function usePrices(symbols: string[], options?: UsePriceStreamOptions) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshInterval = options?.refreshInterval || 1000;

  useEffect(() => {
    if (!symbols || symbols.length === 0) return;

    const fetchPrices = async () => {
      try {
        const res = await fetch(`/api/trading/prices?symbols=${encodeURIComponent(symbols.join(','))}`);
        const data = await res.json();
        if (data.success && data.data) {
          const priceMap: Record<string, PriceData> = {};
          data.data.forEach((p: PriceData) => {
            priceMap[p.symbol] = p;
          });
          setPrices(priceMap);
          setError(null);
        }
      } catch (err) {
        console.error('Prices fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [symbols.join(','), refreshInterval]);

  return { prices, loading, error };
}

/**
 * Hook to get all available trading symbols
 */
export function useSymbols() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [specifications, setSpecifications] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const res = await fetch('/api/trading/symbols');
        const data = await res.json();
        if (data.success) {
          setSymbols(data.data?.symbols || []);
          setSpecifications(data.data?.specifications || {});
          setError(null);
        }
      } catch (err) {
        setError('Failed to fetch symbols');
        console.error('Symbols fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSymbols();
  }, []);

  return { symbols, specifications, loading, error };
}

import { useState, useEffect, useCallback, useRef } from 'react';

interface PriceData {
  symbol: string;
  bid: number;
  ask: number;
  time: string;
  spread?: number;
}

interface UsePriceStreamOptions {
  refreshInterval?: number;
}

/**
 * Hook to get real-time price for a single symbol
 */
export function usePrice(symbol: string, options?: UsePriceStreamOptions) {
  const [price, setPrice] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshInterval = options?.refreshInterval || 1000;

  useEffect(() => {
    if (!symbol) return;

    const fetchPrice = async () => {
      try {
        const res = await fetch(`/api/trading/price?symbol=${encodeURIComponent(symbol)}`);
        const data = await res.json();
        if (data.success && data.data) {
          setPrice(data.data);
          setError(null);
        }
      } catch (err) {
        // Don't set error for network issues, just keep last price
        console.error('Price fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, refreshInterval);
    return () => clearInterval(interval);
  }, [symbol, refreshInterval]);

  return { price, loading, error };
}

/**
 * Hook to get real-time prices for multiple symbols
 */
export function usePrices(symbols: string[], options?: UsePriceStreamOptions) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshInterval = options?.refreshInterval || 1000;

  useEffect(() => {
    if (!symbols || symbols.length === 0) return;

    const fetchPrices = async () => {
      try {
        const res = await fetch(`/api/trading/prices?symbols=${encodeURIComponent(symbols.join(','))}`);
        const data = await res.json();
        if (data.success && data.data) {
          const priceMap: Record<string, PriceData> = {};
          data.data.forEach((p: PriceData) => {
            priceMap[p.symbol] = p;
          });
          setPrices(priceMap);
          setError(null);
        }
      } catch (err) {
        console.error('Prices fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [symbols.join(','), refreshInterval]);

  return { prices, loading, error };
}

/**
 * Hook to get all available trading symbols
 */
export function useSymbols() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [specifications, setSpecifications] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const res = await fetch('/api/trading/symbols');
        const data = await res.json();
        if (data.success) {
          setSymbols(data.data?.symbols || []);
          setSpecifications(data.data?.specifications || {});
          setError(null);
        }
      } catch (err) {
        setError('Failed to fetch symbols');
        console.error('Symbols fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSymbols();
  }, []);

  return { symbols, specifications, loading, error };
}

import { useState, useEffect, useCallback, useRef } from 'react';

interface PriceData {
  symbol: string;
  bid: number;
  ask: number;
  time: string;
  spread?: number;
}

interface UsePriceStreamOptions {
  refreshInterval?: number;
}

/**
 * Hook to get real-time price for a single symbol
 */
export function usePrice(symbol: string, options?: UsePriceStreamOptions) {
  const [price, setPrice] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshInterval = options?.refreshInterval || 1000;

  useEffect(() => {
    if (!symbol) return;

    const fetchPrice = async () => {
      try {
        const res = await fetch(`/api/trading/price?symbol=${encodeURIComponent(symbol)}`);
        const data = await res.json();
        if (data.success && data.data) {
          setPrice(data.data);
          setError(null);
        }
      } catch (err) {
        // Don't set error for network issues, just keep last price
        console.error('Price fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, refreshInterval);
    return () => clearInterval(interval);
  }, [symbol, refreshInterval]);

  return { price, loading, error };
}

/**
 * Hook to get real-time prices for multiple symbols
 */
export function usePrices(symbols: string[], options?: UsePriceStreamOptions) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshInterval = options?.refreshInterval || 1000;

  useEffect(() => {
    if (!symbols || symbols.length === 0) return;

    const fetchPrices = async () => {
      try {
        const res = await fetch(`/api/trading/prices?symbols=${encodeURIComponent(symbols.join(','))}`);
        const data = await res.json();
        if (data.success && data.data) {
          const priceMap: Record<string, PriceData> = {};
          data.data.forEach((p: PriceData) => {
            priceMap[p.symbol] = p;
          });
          setPrices(priceMap);
          setError(null);
        }
      } catch (err) {
        console.error('Prices fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [symbols.join(','), refreshInterval]);

  return { prices, loading, error };
}

/**
 * Hook to get all available trading symbols
 */
export function useSymbols() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [specifications, setSpecifications] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const res = await fetch('/api/trading/symbols');
        const data = await res.json();
        if (data.success) {
          setSymbols(data.data?.symbols || []);
          setSpecifications(data.data?.specifications || {});
          setError(null);
        }
      } catch (err) {
        setError('Failed to fetch symbols');
        console.error('Symbols fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSymbols();
  }, []);

  return { symbols, specifications, loading, error };
}

import { useState, useEffect, useCallback, useRef } from 'react';

interface PriceData {
  symbol: string;
  bid: number;
  ask: number;
  time: string;
  spread?: number;
}

interface UsePriceStreamOptions {
  refreshInterval?: number;
}

/**
 * Hook to get real-time price for a single symbol
 */
export function usePrice(symbol: string, options?: UsePriceStreamOptions) {
  const [price, setPrice] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshInterval = options?.refreshInterval || 1000;

  useEffect(() => {
    if (!symbol) return;

    const fetchPrice = async () => {
      try {
        const res = await fetch(`/api/trading/price?symbol=${encodeURIComponent(symbol)}`);
        const data = await res.json();
        if (data.success && data.data) {
          setPrice(data.data);
          setError(null);
        }
      } catch (err) {
        // Don't set error for network issues, just keep last price
        console.error('Price fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, refreshInterval);
    return () => clearInterval(interval);
  }, [symbol, refreshInterval]);

  return { price, loading, error };
}

/**
 * Hook to get real-time prices for multiple symbols
 */
export function usePrices(symbols: string[], options?: UsePriceStreamOptions) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshInterval = options?.refreshInterval || 1000;

  useEffect(() => {
    if (!symbols || symbols.length === 0) return;

    const fetchPrices = async () => {
      try {
        const res = await fetch(`/api/trading/prices?symbols=${encodeURIComponent(symbols.join(','))}`);
        const data = await res.json();
        if (data.success && data.data) {
          const priceMap: Record<string, PriceData> = {};
          data.data.forEach((p: PriceData) => {
            priceMap[p.symbol] = p;
          });
          setPrices(priceMap);
          setError(null);
        }
      } catch (err) {
        console.error('Prices fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [symbols.join(','), refreshInterval]);

  return { prices, loading, error };
}

/**
 * Hook to get all available trading symbols
 */
export function useSymbols() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [specifications, setSpecifications] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const res = await fetch('/api/trading/symbols');
        const data = await res.json();
        if (data.success) {
          setSymbols(data.data?.symbols || []);
          setSpecifications(data.data?.specifications || {});
          setError(null);
        }
      } catch (err) {
        setError('Failed to fetch symbols');
        console.error('Symbols fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSymbols();
  }, []);

  return { symbols, specifications, loading, error };
}

import { useState, useEffect, useCallback, useRef } from 'react';

interface PriceData {
  symbol: string;
  bid: number;
  ask: number;
  time: string;
  spread?: number;
}

interface UsePriceStreamOptions {
  refreshInterval?: number;
}

/**
 * Hook to get real-time price for a single symbol
 */
export function usePrice(symbol: string, options?: UsePriceStreamOptions) {
  const [price, setPrice] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshInterval = options?.refreshInterval || 1000;

  useEffect(() => {
    if (!symbol) return;

    const fetchPrice = async () => {
      try {
        const res = await fetch(`/api/trading/price?symbol=${encodeURIComponent(symbol)}`);
        const data = await res.json();
        if (data.success && data.data) {
          setPrice(data.data);
          setError(null);
        }
      } catch (err) {
        // Don't set error for network issues, just keep last price
        console.error('Price fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, refreshInterval);
    return () => clearInterval(interval);
  }, [symbol, refreshInterval]);

  return { price, loading, error };
}

/**
 * Hook to get real-time prices for multiple symbols
 */
export function usePrices(symbols: string[], options?: UsePriceStreamOptions) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshInterval = options?.refreshInterval || 1000;

  useEffect(() => {
    if (!symbols || symbols.length === 0) return;

    const fetchPrices = async () => {
      try {
        const res = await fetch(`/api/trading/prices?symbols=${encodeURIComponent(symbols.join(','))}`);
        const data = await res.json();
        if (data.success && data.data) {
          const priceMap: Record<string, PriceData> = {};
          data.data.forEach((p: PriceData) => {
            priceMap[p.symbol] = p;
          });
          setPrices(priceMap);
          setError(null);
        }
      } catch (err) {
        console.error('Prices fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [symbols.join(','), refreshInterval]);

  return { prices, loading, error };
}

/**
 * Hook to get all available trading symbols
 */
export function useSymbols() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [specifications, setSpecifications] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const res = await fetch('/api/trading/symbols');
        const data = await res.json();
        if (data.success) {
          setSymbols(data.data?.symbols || []);
          setSpecifications(data.data?.specifications || {});
          setError(null);
        }
      } catch (err) {
        setError('Failed to fetch symbols');
        console.error('Symbols fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSymbols();
  }, []);

  return { symbols, specifications, loading, error };
}

import { useState, useEffect, useCallback, useRef } from 'react';

interface PriceData {
  symbol: string;
  bid: number;
  ask: number;
  time: string;
  spread?: number;
}

interface UsePriceStreamOptions {
  refreshInterval?: number;
}

/**
 * Hook to get real-time price for a single symbol
 */
export function usePrice(symbol: string, options?: UsePriceStreamOptions) {
  const [price, setPrice] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshInterval = options?.refreshInterval || 1000;

  useEffect(() => {
    if (!symbol) return;

    const fetchPrice = async () => {
      try {
        const res = await fetch(`/api/trading/price?symbol=${encodeURIComponent(symbol)}`);
        const data = await res.json();
        if (data.success && data.data) {
          setPrice(data.data);
          setError(null);
        }
      } catch (err) {
        // Don't set error for network issues, just keep last price
        console.error('Price fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, refreshInterval);
    return () => clearInterval(interval);
  }, [symbol, refreshInterval]);

  return { price, loading, error };
}

/**
 * Hook to get real-time prices for multiple symbols
 */
export function usePrices(symbols: string[], options?: UsePriceStreamOptions) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshInterval = options?.refreshInterval || 1000;

  useEffect(() => {
    if (!symbols || symbols.length === 0) return;

    const fetchPrices = async () => {
      try {
        const res = await fetch(`/api/trading/prices?symbols=${encodeURIComponent(symbols.join(','))}`);
        const data = await res.json();
        if (data.success && data.data) {
          const priceMap: Record<string, PriceData> = {};
          data.data.forEach((p: PriceData) => {
            priceMap[p.symbol] = p;
          });
          setPrices(priceMap);
          setError(null);
        }
      } catch (err) {
        console.error('Prices fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [symbols.join(','), refreshInterval]);

  return { prices, loading, error };
}

/**
 * Hook to get all available trading symbols
 */
export function useSymbols() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [specifications, setSpecifications] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const res = await fetch('/api/trading/symbols');
        const data = await res.json();
        if (data.success) {
          setSymbols(data.data?.symbols || []);
          setSpecifications(data.data?.specifications || {});
          setError(null);
        }
      } catch (err) {
        setError('Failed to fetch symbols');
        console.error('Symbols fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSymbols();
  }, []);

  return { symbols, specifications, loading, error };
}

import { useState, useEffect, useCallback, useRef } from 'react';

interface PriceData {
  symbol: string;
  bid: number;
  ask: number;
  time: string;
  spread?: number;
}

interface UsePriceStreamOptions {
  refreshInterval?: number;
}

/**
 * Hook to get real-time price for a single symbol
 */
export function usePrice(symbol: string, options?: UsePriceStreamOptions) {
  const [price, setPrice] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshInterval = options?.refreshInterval || 1000;

  useEffect(() => {
    if (!symbol) return;

    const fetchPrice = async () => {
      try {
        const res = await fetch(`/api/trading/price?symbol=${encodeURIComponent(symbol)}`);
        const data = await res.json();
        if (data.success && data.data) {
          setPrice(data.data);
          setError(null);
        }
      } catch (err) {
        // Don't set error for network issues, just keep last price
        console.error('Price fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, refreshInterval);
    return () => clearInterval(interval);
  }, [symbol, refreshInterval]);

  return { price, loading, error };
}

/**
 * Hook to get real-time prices for multiple symbols
 */
export function usePrices(symbols: string[], options?: UsePriceStreamOptions) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshInterval = options?.refreshInterval || 1000;

  useEffect(() => {
    if (!symbols || symbols.length === 0) return;

    const fetchPrices = async () => {
      try {
        const res = await fetch(`/api/trading/prices?symbols=${encodeURIComponent(symbols.join(','))}`);
        const data = await res.json();
        if (data.success && data.data) {
          const priceMap: Record<string, PriceData> = {};
          data.data.forEach((p: PriceData) => {
            priceMap[p.symbol] = p;
          });
          setPrices(priceMap);
          setError(null);
        }
      } catch (err) {
        console.error('Prices fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [symbols.join(','), refreshInterval]);

  return { prices, loading, error };
}

/**
 * Hook to get all available trading symbols
 */
export function useSymbols() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [specifications, setSpecifications] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const res = await fetch('/api/trading/symbols');
        const data = await res.json();
        if (data.success) {
          setSymbols(data.data?.symbols || []);
          setSpecifications(data.data?.specifications || {});
          setError(null);
        }
      } catch (err) {
        setError('Failed to fetch symbols');
        console.error('Symbols fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSymbols();
  }, []);

  return { symbols, specifications, loading, error };
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface PriceData {
  bid: number;
  ask: number;
  spread: number;
  time: number;
}

interface UsePriceStreamOptions {
  symbols: string[];
  interval?: number; // Polling interval in ms (default 500ms)
  enabled?: boolean;
}

export function usePriceStream({ symbols, interval = 500, enabled = true }: UsePriceStreamOptions) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPrices = useCallback(async () => {
    if (!enabled || symbols.length === 0) return;

    try {
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      const res = await fetch(`/api/prices/stream?symbols=${symbols.join(',')}`, {
        signal: abortControllerRef.current.signal,
        cache: 'no-store',
      });
      
      if (!res.ok) throw new Error('Failed to fetch prices');
      
      const data = await res.json();
      
      if (data.success && data.prices) {
        setPrices(data.prices);
        setError(null);
      }
      
      setLoading(false);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    }
  }, [symbols, enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    fetchPrices();

    // Set up polling
    intervalRef.current = setInterval(fetchPrices, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPrices, interval, enabled]);

  return { prices, loading, error, refetch: fetchPrices };
}

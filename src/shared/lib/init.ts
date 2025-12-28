/**
 * Initialize polyfills and global configurations
 * This file should be imported first in the application
 * 
 * IMPORTANT: This must be imported before any component that uses localStorage
 */

// Initialize localStorage polyfill FIRST
// This must be a direct import, not a dynamic import
import '@/infrastructure/storage/localStorage-polyfill';

// Ensure polyfill is applied immediately
if (typeof globalThis !== 'undefined' && !globalThis.localStorage) {
  const mockStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  };
  (globalThis as any).localStorage = mockStorage;
  (globalThis as any).sessionStorage = mockStorage;
}


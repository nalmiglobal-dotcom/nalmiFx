/**
 * localStorage polyfill for SSR safety
 * This prevents errors when localStorage is accessed during server-side rendering
 */

const createMockStorage = (): Storage => ({
  getItem: (key: string) => null,
  setItem: (key: string, value: string) => {},
  removeItem: (key: string) => {},
  clear: () => {},
  key: (index: number) => null,
  length: 0,
});

// Check if localStorage is available and functional
function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined') {
      return false;
    }
    
    const test = '__localStorage_test__';
    if (!window.localStorage) {
      return false;
    }
    
    // Check if getItem is a function
    if (typeof window.localStorage.getItem !== 'function') {
      return false;
    }
    
    // Test actual functionality
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

// Initialize polyfill immediately using IIFE
(function initializeLocalStoragePolyfill() {
  const mockStorage = createMockStorage();
  
  // Server-side: Always set mock storage
  if (typeof window === 'undefined') {
    // Set on globalThis for universal compatibility
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).localStorage = mockStorage;
      (globalThis as any).sessionStorage = mockStorage;
    }
    if (typeof global !== 'undefined') {
      (global as any).localStorage = mockStorage;
      (global as any).sessionStorage = mockStorage;
    }
  } else {
    // Client-side: Ensure localStorage is safe
    try {
      if (!isLocalStorageAvailable()) {
        // If localStorage is not available or broken, create a mock
        (window as any).localStorage = mockStorage;
        (window as any).sessionStorage = mockStorage;
      }
      
      // Ensure it's also on globalThis for consistency
      if (typeof globalThis !== 'undefined') {
        (globalThis as any).localStorage = window.localStorage;
        (globalThis as any).sessionStorage = window.sessionStorage;
      }
    } catch (e) {
      // If anything fails, use mock storage
      (window as any).localStorage = mockStorage;
      (window as any).sessionStorage = mockStorage;
      if (typeof globalThis !== 'undefined') {
        (globalThis as any).localStorage = mockStorage;
        (globalThis as any).sessionStorage = mockStorage;
      }
    }
  }
})();

// Export for explicit initialization if needed
export function ensureLocalStoragePolyfill() {
  const mockStorage = createMockStorage();
  
  if (typeof window === 'undefined') {
    if (typeof globalThis !== 'undefined') {
      if (!globalThis.localStorage || typeof (globalThis as any).localStorage.getItem !== 'function') {
        (globalThis as any).localStorage = mockStorage;
      }
      if (!globalThis.sessionStorage || typeof (globalThis as any).sessionStorage.getItem !== 'function') {
        (globalThis as any).sessionStorage = mockStorage;
      }
    }
  } else {
    if (!window.localStorage || typeof window.localStorage.getItem !== 'function') {
      (window as any).localStorage = mockStorage;
    }
    if (!window.sessionStorage || typeof window.sessionStorage.getItem !== 'function') {
      (window as any).sessionStorage = mockStorage;
    }
  }
}


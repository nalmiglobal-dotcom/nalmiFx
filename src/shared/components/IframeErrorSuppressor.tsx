"use client";

import { useEffect } from "react";

/**
 * Suppresses iframe-related console errors when the app is not running in an iframe.
 * This prevents errors from external scripts (like route-messenger) that expect to be in an iframe.
 */
export function IframeErrorSuppressor() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const inIframe = window.parent !== window;
    
    // If not in iframe, suppress contentWindow-related errors
    if (!inIframe) {
      const originalError = console.error;
      const originalWarn = console.warn;
      
      // Override console.error to filter iframe-related errors
      console.error = (...args: any[]) => {
        const message = args[0]?.toString() || '';
        if (
          message.includes('contentWindow') ||
          message.includes('Cannot listen to the event from the provided iframe') ||
          message.includes('iframe') && message.includes('not available')
        ) {
          // Suppress iframe-related errors when not in iframe
          return;
        }
        originalError.apply(console, args);
      };
      
      // Override console.warn to filter iframe-related warnings
      console.warn = (...args: any[]) => {
        const message = args[0]?.toString() || '';
        if (
          message.includes('contentWindow') ||
          message.includes('Cannot listen to the event from the provided iframe') ||
          message.includes('iframe') && message.includes('not available')
        ) {
          // Suppress iframe-related warnings when not in iframe
          return;
        }
        originalWarn.apply(console, args);
      };
      
      // Restore original console methods on cleanup
      return () => {
        console.error = originalError;
        console.warn = originalWarn;
      };
    }
  }, []);

  return null;
}


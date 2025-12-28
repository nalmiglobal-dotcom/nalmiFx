"use client";

import Script from "next/script";

export function OrchidsScripts() {
  return (
    <>
      <Script
        id="orchids-browser-logs"
        src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts/orchids-browser-logs.js"
        strategy="afterInteractive"
        data-orchids-project-id="0eb9ce97-f6b7-48d6-86c2-0c59527ba718"
        onError={(e) => {
          // Suppress iframe-related errors when not in iframe
          console.warn('Orchids browser logs script error (can be ignored if not in iframe):', e);
        }}
      />
      <Script
        id="route-messenger"
        src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts//route-messenger.js"
        strategy="afterInteractive"
        data-target-origin="*"
        data-message-type="ROUTE_CHANGE"
        data-include-search-params="true"
        data-only-in-iframe="true"
        data-debug="true"
        data-custom-data='{"appName": "YourApp", "version": "1.0.0", "greeting": "hi"}'
        onError={(e) => {
          // Suppress iframe-related errors when not in iframe
          console.warn('Route messenger script error (can be ignored if not in iframe):', e);
        }}
      />
    </>
  );
}


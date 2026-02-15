import { useEffect, useState } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const key = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
    const host = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

    if (key && host) {
      posthog.init(key, {
        api_host: host,
        capture_pageview: true,
        capture_pageleave: true,
        capture_performance: { web_vitals: true },
      });
      setIsReady(true);
    }
  }, []);

  if (!isReady) {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

export { PostHogProvider };

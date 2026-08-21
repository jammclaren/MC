"use client";

import { useEffect, useState } from "react";

/** Small "ops center is live" affordance: a ticking UTC clock. Zulu time is
 * the standard military time reference, appropriate for a C2 dashboard. */
export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    // Defer the first tick instead of calling setState synchronously in the
    // effect body (avoids a cascading render right on mount commit).
    const timeout = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  if (!now) {
    return <span className="font-mono text-xs text-muted-foreground">--:--:--Z</span>;
  }

  const time = now.toISOString().slice(11, 19);

  return (
    <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-status-good opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-status-good" />
      </span>
      {time}Z
    </span>
  );
}

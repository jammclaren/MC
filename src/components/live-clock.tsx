"use client";

import { useEffect, useState } from "react";

const PH_TIME_FORMAT = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** Small "ops center is live" affordance: a ticking clock showing current
 * Philippine local time (PHT, UTC+8) — WESMINCOM's own timezone. */
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
    return <span className="font-mono text-xs text-muted-foreground">--:--:-- PHT</span>;
  }

  const time = PH_TIME_FORMAT.format(now);

  return (
    <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-status-good opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-status-good" />
      </span>
      {time} PHT
    </span>
  );
}

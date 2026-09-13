"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Catches any uncaught error in a page/layout below the root — most
// commonly a transient database hiccup (pool exhaustion, a brief
// authentication rejection while Supabase's pooler recovers) — and shows a
// retry screen instead of the framework's raw crash page. `reset()` re-renders
// the segment without a full reload, so a since-recovered backend clears
// this on the very next request.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Card className="max-w-md border-destructive/30">
        <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <div>
            <h1 className="font-display text-lg font-bold tracking-wide uppercase">
              Temporarily Unavailable
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              The dashboard hit a transient error, likely a brief database
              connection hiccup. Your data is safe — try again in a moment.
            </p>
          </div>
          <Button onClick={() => reset()}>Retry</Button>
        </CardContent>
      </Card>
    </div>
  );
}

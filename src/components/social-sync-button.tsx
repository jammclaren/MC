"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SocialSyncButton() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/social-posts/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Sync failed");
      }
      if (data.configured === false) {
        toast.info(data.message ?? "Facebook sync is not configured yet");
      } else {
        const created = (data.pages ?? []).reduce(
          (sum: number, p: { created?: number }) => sum + (p.created ?? 0),
          0
        );
        toast.success(`Sync complete — ${created} new post${created === 1 ? "" : "s"} found`);
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleSync} disabled={syncing}>
      <RefreshCw className={syncing ? "animate-spin" : ""} />
      {syncing ? "Syncing..." : "Sync Now"}
    </Button>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DeleteButton({
  url,
  confirmMessage,
  label = "Delete",
}: {
  url: string;
  confirmMessage: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!window.confirm(confirmMessage)) return;
    setPending(true);
    try {
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed");
      }
      toast.success("Deleted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={handleClick}>
      {pending ? "..." : label}
    </Button>
  );
}

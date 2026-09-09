"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UserDeviceRow } from "@/lib/queries/user-devices";

export type DeviceLoginRow = Omit<UserDeviceRow, "lastSeenAt"> & {
  lastSeenAt: string;
};

const STATUS_BADGE: Record<UserDeviceRow["status"], "warning" | "good" | "critical"> = {
  PENDING: "warning",
  APPROVED: "good",
  KICKED: "critical",
};

function DeviceRowActions({ device }: { device: DeviceLoginRow }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function act(action: "approve" | "kick") {
    if (action === "kick" && !window.confirm(`Kick ${device.userName}'s ${device.deviceLabel} device? It will be signed out immediately.`)) {
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/admin/user-devices/${device.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Action failed");
      }
      toast.success(action === "approve" ? "Device approved" : "Device kicked");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex justify-end gap-1">
      {device.status !== "APPROVED" && (
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => act("approve")}>
          Approve
        </Button>
      )}
      {device.status !== "KICKED" && (
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => act("kick")}>
          Kick
        </Button>
      )}
    </div>
  );
}

export function DeviceLoginsTable({ devices }: { devices: DeviceLoginRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Device</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Last Seen</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {devices.map((device) => (
          <TableRow key={device.id}>
            <TableCell>
              {device.userName}
              <span className="block text-xs text-muted-foreground">{device.userEmail}</span>
            </TableCell>
            <TableCell>
              {device.deviceLabel}
              <span className="block text-xs text-muted-foreground">{device.deviceType}</span>
            </TableCell>
            <TableCell>{device.location ?? "Unknown"}</TableCell>
            <TableCell>{new Date(device.lastSeenAt).toLocaleString()}</TableCell>
            <TableCell>
              <Badge variant={STATUS_BADGE[device.status]}>{device.status}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <DeviceRowActions device={device} />
            </TableCell>
          </TableRow>
        ))}
        {devices.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              No device logins recorded yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

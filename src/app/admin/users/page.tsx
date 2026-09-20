import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { nowMs } from "@/lib/time";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/stat-tile";
import { AnimatedCounter } from "@/components/animated-counter";
import { UserFormDialog } from "@/components/user-form-dialog";
import { UsersTable } from "@/components/users-table";
import { UnitConditionCard } from "@/components/unit-condition-card";
import { NavCollapseToggle } from "@/components/nav-collapse-toggle";
import { listUnitConditions } from "@/lib/queries/unit-conditions";
import { Users, Smartphone, Radio } from "lucide-react";

// Devices get their `lastSeenAt` opportunistically refreshed on every
// authenticated request (throttled — see proxy.ts), so anything newer than
// this window is treated as "online" — a little looser than the refresh
// throttle itself so a device isn't flagged offline between touches.
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export default async function AdminUsersPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "ADMIN") {
    notFound();
  }

  const onlineSince = new Date(nowMs() - ONLINE_WINDOW_MS);
  const [users, jtfs, activeDeviceCounts, onlineDevices, unitConditions] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        jtfId: true,
        jtf: { select: { name: true } },
        warfightingFunction: true,
        createdAt: true,
        maxDevices: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.jTF.findMany({ orderBy: { name: "asc" } }),
    // Counted separately (not via a plain relation _count) so KICKED
    // devices don't inflate the figure — this should match the same
    // "active" set the login-time maxDevices check enforces.
    prisma.userDevice.groupBy({
      by: ["userId"],
      where: { status: { not: "KICKED" } },
      _count: { _all: true },
    }),
    prisma.userDevice.findMany({
      where: { status: { not: "KICKED" }, lastSeenAt: { gte: onlineSince } },
      select: { userId: true },
    }),
    listUnitConditions(),
  ]);
  const jtfOptions = jtfs.map((jtf) => ({ id: jtf.id, name: jtf.name }));
  const activeDeviceCountByUserId = new Map(
    activeDeviceCounts.map((row) => [row.userId, row._count._all])
  );
  const totalDeviceLogins = activeDeviceCounts.reduce((sum, row) => sum + row._count._all, 0);
  const onlineDeviceCount = onlineDevices.length;
  const onlineUserCount = new Set(onlineDevices.map((d) => d.userId)).size;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold tracking-wide uppercase">User Management</h1>
          <NavCollapseToggle />
        </div>
        <UserFormDialog jtfOptions={jtfOptions} trigger={<Button>Create User</Button>} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Total Accounts" value={users.length} icon={Users} />
        <StatTile
          label="Total Device Logins"
          value={<AnimatedCounter value={totalDeviceLogins} />}
          icon={Smartphone}
        />
        <StatTile
          label="Online Now"
          value={<AnimatedCounter value={onlineDeviceCount} />}
          icon={Radio}
          tone={onlineDeviceCount > 0 ? "good" : "default"}
          hint={`${onlineUserCount.toLocaleString()} user${onlineUserCount === 1 ? "" : "s"}`}
        />
      </div>

      <UnitConditionCard rows={unitConditions} />

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersTable
            users={users.map((row) => ({
              id: row.id,
              name: row.name,
              email: row.email,
              role: row.role,
              jtfId: row.jtfId,
              jtfName: row.jtf?.name ?? null,
              warfightingFunction: row.warfightingFunction,
              createdAtLabel: row.createdAt.toLocaleDateString(),
              deviceLoginCount: activeDeviceCountByUserId.get(row.id) ?? 0,
              maxDevices: row.maxDevices,
            }))}
            jtfOptions={jtfOptions}
            currentUserId={user.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}

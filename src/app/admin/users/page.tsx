import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { listUserDevices } from "@/lib/queries/user-devices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserFormDialog } from "@/components/user-form-dialog";
import { UsersTable } from "@/components/users-table";
import { DeviceLoginsTable } from "@/components/device-logins-table";

export default async function AdminUsersPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "ADMIN") {
    notFound();
  }

  const [users, jtfs, devices] = await Promise.all([
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
      },
      orderBy: { name: "asc" },
    }),
    prisma.jTF.findMany({ orderBy: { name: "asc" } }),
    listUserDevices(),
  ]);
  const jtfOptions = jtfs.map((jtf) => ({ id: jtf.id, name: jtf.name }));
  const pendingDeviceCount = devices.filter((d) => d.status === "PENDING").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide uppercase">User Management</h1>
        </div>
        <UserFormDialog jtfOptions={jtfOptions} trigger={<Button>Create User</Button>} />
      </div>

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
            }))}
            jtfOptions={jtfOptions}
            currentUserId={user.id}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Device Logins
            {pendingDeviceCount > 0 && <Badge variant="warning">{pendingDeviceCount} pending review</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DeviceLoginsTable
            devices={devices.map((d) => ({ ...d, lastSeenAt: d.lastSeenAt.toISOString() }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

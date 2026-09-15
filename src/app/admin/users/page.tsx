import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserFormDialog } from "@/components/user-form-dialog";
import { UsersTable } from "@/components/users-table";

export default async function AdminUsersPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "ADMIN") {
    notFound();
  }

  const [users, jtfs] = await Promise.all([
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
        _count: { select: { devices: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.jTF.findMany({ orderBy: { name: "asc" } }),
  ]);
  const jtfOptions = jtfs.map((jtf) => ({ id: jtf.id, name: jtf.name }));

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
              deviceLoginCount: row._count.devices,
            }))}
            jtfOptions={jtfOptions}
            currentUserId={user.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}

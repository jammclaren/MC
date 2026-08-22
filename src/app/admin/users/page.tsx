import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { UserFormDialog } from "@/components/user-form-dialog";
import { DeleteButton } from "@/components/delete-button";

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
          <p className="text-sm text-muted-foreground">
            Create accounts and assign role + JTF scope.
          </p>
        </div>
        <UserFormDialog jtfOptions={jtfOptions} trigger={<Button>Create User</Button>} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>{users.length} account(s).</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>JTF / Function</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.role}</TableCell>
                  <TableCell>
                    {row.jtf?.name ?? row.warfightingFunction?.replaceAll("_", " ") ?? "—"}
                  </TableCell>
                  <TableCell>{row.createdAt.toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <UserFormDialog
                        jtfOptions={jtfOptions}
                        initial={{
                          id: row.id,
                          name: row.name,
                          role: row.role,
                          jtfId: row.jtfId,
                          warfightingFunction: row.warfightingFunction,
                        }}
                        trigger={
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        }
                      />
                      {row.id !== user.id && (
                        <DeleteButton
                          url={`/api/admin/users/${row.id}`}
                          confirmMessage={`Delete user ${row.name}? This cannot be undone.`}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

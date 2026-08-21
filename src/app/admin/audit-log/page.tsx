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

const ENTITIES = [
  "User",
  "AccomplishmentRecord",
  "HviLogEntry",
  "RidoSettlement",
  "ElectionArea",
  "TroopDeployment",
  "Incident",
  "ElectionOpsStatus",
];

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; from?: string; to?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "ADMIN" && user.role !== "COMMAND") {
    notFound();
  }

  const filters = await searchParams;

  const logs = await prisma.auditLog.findMany({
    where: {
      entity: filters.entity || undefined,
      createdAt: {
        gte: filters.from ? new Date(filters.from) : undefined,
        lte: filters.to ? new Date(filters.to) : undefined,
      },
    },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Every data change: who, what, when. Read-only.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3 text-sm" method="get">
            <div className="flex flex-col gap-1">
              <label htmlFor="entity" className="text-muted-foreground">
                Entity
              </label>
              <select
                id="entity"
                name="entity"
                defaultValue={filters.entity ?? ""}
                className="rounded border bg-background px-2 py-1.5"
              >
                <option value="">All</option>
                {ENTITIES.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="from" className="text-muted-foreground">
                From
              </label>
              <input
                id="from"
                name="from"
                type="date"
                defaultValue={filters.from ?? ""}
                className="rounded border bg-background px-2 py-1.5"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="to" className="text-muted-foreground">
                To
              </label>
              <input
                id="to"
                name="to"
                type="date"
                defaultValue={filters.to ?? ""}
                className="rounded border bg-background px-2 py-1.5"
              />
            </div>
            <Button type="submit" variant="outline">
              Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Changes</CardTitle>
          <CardDescription>{logs.length} shown (max 200).</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead>Diff</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {log.createdAt.toLocaleString()}
                  </TableCell>
                  <TableCell>{log.user.name}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.entity}</TableCell>
                  <TableCell className="font-mono text-xs">{log.entityId}</TableCell>
                  <TableCell className="max-w-md">
                    <pre className="max-h-24 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                      {log.diff ? JSON.stringify(log.diff, null, 2) : "—"}
                    </pre>
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No audit log entries match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

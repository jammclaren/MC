import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getDeploymentData } from "@/lib/queries/deployments";
import { safePercent } from "@/lib/percentages";
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

export default async function BpeDeploymentPage({
  searchParams,
}: {
  searchParams: Promise<{ jtfId?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const { jtfId } = await searchParams;
  const [data, jtfs] = await Promise.all([
    getDeploymentData(user, jtfId),
    prisma.jTF.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          BPE 2026 — Deployment
        </h1>
        <p className="text-sm text-muted-foreground">
          BARMM Parliamentary Election security operations, 30 Jul–15 Sep 2026.
        </p>
      </div>

      <form className="flex items-center gap-2 text-sm" action="/bpe-deployment" method="get">
        <label htmlFor="jtfId" className="text-muted-foreground">
          JTF:
        </label>
        <select
          id="jtfId"
          name="jtfId"
          defaultValue={jtfId ?? ""}
          className="rounded border bg-background px-2 py-1"
        >
          <option value="">All (rollup)</option>
          {jtfs.map((jtf) => (
            <option key={jtf.id} value={jtf.id}>
              {jtf.name}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded border px-3 py-1.5 hover:bg-muted">
          Filter
        </button>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.jtfCards.map((card) => {
          const coveragePct = safePercent(card.deployedToPolling, card.registeredVoters);
          return (
            <Card key={card.jtfId}>
              <CardHeader>
                <CardTitle className="text-base">{card.jtfName}</CardTitle>
                <CardDescription>
                  {card.numPrecincts.toLocaleString()} precincts ·{" "}
                  {card.registeredVoters.toLocaleString()} registered voters
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deployed to Polling</span>
                  <span className="font-medium">
                    {card.deployedToPolling.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">QRF</span>
                  <span className="font-medium">{card.qrf.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Voter Coverage</span>
                  <span className="font-medium">
                    {coveragePct === null ? "—" : `${coveragePct.toFixed(1)}%`}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {data.jtfCards.length === 0 && (
          <p className="text-sm text-muted-foreground">No JTFs in scope.</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recapitulation</CardTitle>
          <CardDescription>Command-wide total, auto-computed from unit reports.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-8 text-sm">
          <div>
            <div className="text-2xl font-semibold">
              {data.totalDeployed.toLocaleString()}
            </div>
            <div className="text-muted-foreground">Deployed to Polling</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">{data.totalQrf.toLocaleString()}</div>
            <div className="text-muted-foreground">QRF</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unit-Level Breakdown</CardTitle>
          <CardDescription>Most recently reported first.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>JTF</TableHead>
                <TableHead>Area</TableHead>
                <TableHead className="text-right">Polling</TableHead>
                <TableHead className="text-right">QRF</TableHead>
                <TableHead className="text-right">AFP Off.</TableHead>
                <TableHead className="text-right">AFP Enl.</TableHead>
                <TableHead className="text-right">CAA</TableHead>
                <TableHead className="text-right">WAVs/TAV</TableHead>
                <TableHead className="text-right">PNP Off.</TableHead>
                <TableHead className="text-right">PNP Enl.</TableHead>
                <TableHead className="text-right">Checkpoints</TableHead>
                <TableHead>Reported</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.unitLabel ?? "—"}</TableCell>
                  <TableCell>{row.jtfName}</TableCell>
                  <TableCell>{row.areaLabel ?? "—"}</TableCell>
                  <TableCell className="text-right">{row.deployedToPolling}</TableCell>
                  <TableCell className="text-right">{row.qrf}</TableCell>
                  <TableCell className="text-right">{row.afpOfficers}</TableCell>
                  <TableCell className="text-right">{row.afpEnlisted}</TableCell>
                  <TableCell className="text-right">{row.caa}</TableCell>
                  <TableCell className="text-right">{row.wavsTav}</TableCell>
                  <TableCell className="text-right">{row.pnpOfficers}</TableCell>
                  <TableCell className="text-right">{row.pnpEnlisted}</TableCell>
                  <TableCell className="text-right">{row.checkpointOps}</TableCell>
                  <TableCell>{row.reportedAt.toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {data.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={13} className="text-center text-muted-foreground">
                    No deployment reports yet.
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

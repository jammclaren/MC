import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getIndicatorTable, getRidoTable } from "@/lib/queries/accomplishments";
import type { SessionUser } from "@/lib/rbac";
import { cn } from "@/lib/utils";
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

const CATEGORIES = ["CTG", "LTG", "CBC"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABELS: Record<Category, string> = {
  CTG: "CTG — Communist Terrorist Group",
  LTG: "LTG — Local Terrorist Groups",
  CBC: "CBC — Community-Based Conflict (RIDO)",
};

function isCategory(value: string | undefined): value is Category {
  return CATEGORIES.includes(value as Category);
}

export default async function AccomplishmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; jtfId?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const category: Category = isCategory(params.category) ? params.category : "CTG";
  const jtfId = params.jtfId || undefined;

  const jtfs = await prisma.jTF.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide uppercase">Accomplishments</h1>
        <p className="text-sm text-muted-foreground">
          Quarterly counter-threat metrics tracked against annual targets.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav className="flex gap-1 rounded-md border bg-muted p-1">
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/accomplishments?category=${c}${jtfId ? `&jtfId=${jtfId}` : ""}`}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                c === category
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {c}
            </Link>
          ))}
        </nav>

        <form className="flex items-center gap-2 text-sm" action="/accomplishments" method="get">
          <input type="hidden" name="category" value={category} />
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{CATEGORY_LABELS[category]}</CardTitle>
          <CardDescription>
            {category === "CBC"
              ? "RIDO settlements per quarter"
              : "Target (YE) vs. actual, cumulative, PSR/NPSR split"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {category === "CBC" ? (
            <CbcTable jtfId={jtfId} user={user} />
          ) : (
            <IndicatorTableSection category={category} jtfId={jtfId} user={user} />
          )}
        </CardContent>
      </Card>

      {category !== "CBC" && <HviLogSection category={category} />}
    </div>
  );
}

async function IndicatorTableSection({
  category,
  jtfId,
  user,
}: {
  category: "CTG" | "LTG";
  jtfId?: string;
  user: SessionUser;
}) {
  const { quarters, rows } = await getIndicatorTable(user, category, jtfId);
  const columnCount = 6 + quarters.length;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Indicator</TableHead>
          <TableHead>Subgroup</TableHead>
          <TableHead className="text-right">Target (YE)</TableHead>
          {quarters.map((q) => (
            <TableHead key={q} className="text-right">
              {q}
            </TableHead>
          ))}
          <TableHead className="text-right">Cumulative</TableHead>
          <TableHead className="text-right">PSR</TableHead>
          <TableHead className="text-right">NPSR</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.indicatorId}>
            <TableCell>{row.name}</TableCell>
            <TableCell>{row.subgroup ?? "—"}</TableCell>
            <TableCell className="text-right">{row.targetYE ?? "—"}</TableCell>
            {quarters.map((q) => (
              <TableCell key={q} className="text-right">
                {row.totalsByQuarter[q] ?? 0}
              </TableCell>
            ))}
            <TableCell className="text-right font-medium">{row.cumulative}</TableCell>
            <TableCell className="text-right">
              {row.hasForceStatusSplit ? row.psrTotal : "—"}
            </TableCell>
            <TableCell className="text-right">
              {row.hasForceStatusSplit ? row.npsrTotal : "—"}
            </TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={columnCount} className="text-center text-muted-foreground">
              No indicators defined for this category yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

async function CbcTable({ jtfId, user }: { jtfId?: string; user: SessionUser }) {
  const rows = await getRidoTable(user, jtfId);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>JTF</TableHead>
          <TableHead>Quarter</TableHead>
          <TableHead className="text-right">LLEs/PAGs</TableHead>
          <TableHead className="text-right">MNLF</TableHead>
          <TableHead className="text-right">MILF</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.jtfId}-${row.quarter}`}>
            <TableCell>{row.jtfName}</TableCell>
            <TableCell>{row.quarter}</TableCell>
            <TableCell className="text-right">{row.llesPags}</TableCell>
            <TableCell className="text-right">{row.mnlf}</TableCell>
            <TableCell className="text-right">{row.milf}</TableCell>
            <TableCell className="text-right font-medium">{row.total}</TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              No RIDO settlements recorded yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

async function HviLogSection({ category }: { category: "CTG" | "LTG" }) {
  const entries = await prisma.hviLogEntry.findMany({
    where: { category },
    orderBy: { date: "desc" },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>HVI Neutralization Log</CardTitle>
        <CardDescription>Most recent first.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {entries.map((entry) => (
          <div key={entry.id} className="border-b pb-3 last:border-b-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-medium">{entry.name}</span>
              <span className="text-sm text-muted-foreground">
                {entry.date.toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {entry.role ? `${entry.role} · ` : ""}
              {entry.outcome}
              {entry.location ? ` · ${entry.location}` : ""}
            </p>
            <p className="mt-1 text-sm">{entry.narrative}</p>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground">No HVI log entries yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

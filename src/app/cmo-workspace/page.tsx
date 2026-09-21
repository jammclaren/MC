import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canAccessCmoWorkspace, canWriteCmoActivity } from "@/lib/rbac";
import { listCmoActivities } from "@/lib/queries/cmo-activities";
import { computeCmoActivityAssessment, CMO_CATEGORY_LABELS } from "@/lib/cmo-activity-assessment";
import type { CmoActivityCategory, CmoActivityRow } from "@/lib/queries/cmo-activities";
import { getSipsDeclarationCount } from "@/lib/queries/sips-declaration-count";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/stat-tile";
import { Button } from "@/components/ui/button";
import { CmoActivityFormDialog } from "@/components/cmo-activity-form-dialog";
import { CmoActivityMapLoader } from "@/components/cmo-activity-map-loader";
import { SipsDeclarationCountTile } from "@/components/sips-declaration-count-tile";
import { NavCollapseToggle } from "@/components/nav-collapse-toggle";
import { Megaphone, HeartHandshake, Brain, GraduationCap } from "lucide-react";

const CATEGORY_ORDER: CmoActivityCategory[] = ["PUBLIC_AFFAIRS", "CIVIL_AFFAIRS", "PSYOPS", "IEC"];

const CATEGORY_ICONS: Record<CmoActivityCategory, typeof Megaphone> = {
  PUBLIC_AFFAIRS: Megaphone,
  CIVIL_AFFAIRS: HeartHandshake,
  PSYOPS: Brain,
  IEC: GraduationCap,
};

function mostSignificant(rows: CmoActivityRow[], category: CmoActivityCategory): CmoActivityRow | null {
  return rows.find((r) => r.category === category) ?? null;
}

export default async function CmoWorkspacePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (!canAccessCmoWorkspace(user)) {
    notFound();
  }
  const canWrite = canWriteCmoActivity(user);

  // Already sorted by date desc (see listCmoActivities), so the first match
  // per category is that category's most recent — i.e. most significant.
  const [rows, sipsCount] = await Promise.all([
    listCmoActivities(user),
    getSipsDeclarationCount(),
  ]);
  const assessment = computeCmoActivityAssessment(rows);

  const countsByCategory = new Map<CmoActivityCategory, number>();
  for (const row of rows) {
    countsByCategory.set(row.category, (countsByCategory.get(row.category) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold tracking-wide uppercase">CMO Workspace</h1>
          <NavCollapseToggle />
        </div>
        {canWrite && <CmoActivityFormDialog trigger={<Button>Log Activity</Button>} />}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {CATEGORY_ORDER.map((cat) => (
          <StatTile
            key={cat}
            label={`${CMO_CATEGORY_LABELS[cat]}`}
            value={(countsByCategory.get(cat) ?? 0).toLocaleString()}
            icon={CATEGORY_ICONS[cat]}
          />
        ))}
        <SipsDeclarationCountTile
          municipalCount={sipsCount.municipalCount}
          provinceCount={sipsCount.provinceCount}
          updatedByName={sipsCount.updatedByName}
          updatedAt={sipsCount.updatedAt}
          canWrite={canWrite}
        />
      </div>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-xl">CMO Activity Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              {CATEGORY_ORDER.map((cat) => {
                const sig = mostSignificant(rows, cat);
                return (
                  <Card key={cat}>
                    <CardHeader>
                      <CardTitle className="text-sm">{CMO_CATEGORY_LABELS[cat]}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {sig ? (
                        <p className="text-sm">
                          <span className="line-clamp-2 font-medium">{sig.title}</span>
                          {sig.locationLabel ? ` — ${sig.locationLabel}` : ""}
                          <br />
                          <span className="text-muted-foreground">
                            {new Date(sig.date).toLocaleDateString()}
                          </span>
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">No activity logged yet.</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex flex-col gap-4">
              <div className="relative min-h-[400px] flex-1">
                <CmoActivityMapLoader rows={rows} canWrite={canWrite} />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <h3 className="mb-2 font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Analysis &amp; Assessment
                </h3>
                <ul className="flex flex-col gap-2 text-sm">
                  {assessment.analysis.map((line, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

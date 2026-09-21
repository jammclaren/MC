import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getOverviewData } from "@/lib/queries/overview";
import { getIncidentMarkers } from "@/lib/queries/incident-markers";
import { listJtfAssessments } from "@/lib/queries/jtf-assessments";
import { canAccessPage, canWriteAlertLevel, canWriteJtf } from "@/lib/rbac";
import { nowMs } from "@/lib/time";
import { StatTile } from "@/components/stat-tile";
import { DailyAssessmentPanel } from "@/components/daily-assessment-panel";
import { JtfAssessmentCard } from "@/components/jtf-assessment-card";
import { OverviewIncidentOpsPanel } from "@/components/overview-incident-ops-panel";
import { UnitConditionSummary } from "@/components/unit-condition-summary";
import { AlertLevelTile } from "@/components/alert-level-tile";
import { NavCollapseToggle } from "@/components/nav-collapse-toggle";
import { listUnitConditions } from "@/lib/queries/unit-conditions";
import { getAlertLevelStatus } from "@/lib/queries/alert-level";
import { criticalAssetsStatus } from "@/lib/critical-assets-status";
import { Users, ShieldAlert, Crosshair, Truck, Shield, Rocket, Ship } from "lucide-react";

export default async function OverviewPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const [data, incidentMarkers, jtfAssessments, unitConditions, alertLevel] = await Promise.all([
    getOverviewData(user),
    getIncidentMarkers(user),
    listJtfAssessments(user),
    listUnitConditions(),
    getAlertLevelStatus(),
  ]);
  const now = nowMs();
  const canSubmitAssessment = !!user.jtfId && canWriteJtf(user, user.jtfId);
  const criticalStatus = criticalAssetsStatus(data);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-2xl font-bold tracking-wide uppercase">Command Overview</h1>
        <NavCollapseToggle />
      </div>

      <UnitConditionSummary groups={unitConditions} viewerJtfId={user.jtfId} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <AlertLevelTile
          level={alertLevel.level}
          updatedByName={alertLevel.updatedByName}
          updatedAt={alertLevel.updatedAt?.toISOString() ?? null}
          canWrite={canWriteAlertLevel(user)}
        />
        <StatTile
          label="Status of Critical Assets"
          value={<span className="text-lg leading-tight">{criticalStatus.value}</span>}
          icon={ShieldAlert}
          tone={criticalStatus.tone}
        />
        <StatTile label="Total Strength" value={data.totalStrength.toLocaleString()} icon={Users} />
        <StatTile
          label="Checkpoint Operations"
          value={data.totalCheckpointOps.toLocaleString()}
          icon={Crosshair}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Number of WAVs" value={data.totalWav.toLocaleString()} icon={Truck} />
        <StatTile label="Number of TAVs" value={data.totalTav.toLocaleString()} icon={Shield} />
        <StatTile
          label="Number of Artillery Assets"
          value={data.totalArtillery.toLocaleString()}
          icon={Rocket}
        />
        <StatTile label="Number of Naval Assets" value={data.totalNaval.toLocaleString()} icon={Ship} />
      </div>

      <OverviewIncidentOpsPanel
        markers={incidentMarkers}
        incidentsByDay={data.incidentsByDay}
        now={now}
        recentIncidentCount30d={data.recentIncidentCount30d}
        canAccessSituationMap={canAccessPage(user, "situation-map")}
      />

      <JtfAssessmentCard assessments={jtfAssessments} canSubmit={canSubmitAssessment} />

      <DailyAssessmentPanel />
    </div>
  );
}

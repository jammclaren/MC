import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canAccessSituationReport } from "@/lib/rbac";
import { getSituationReport } from "@/lib/queries/situation-report";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SituationReportEditor } from "@/components/situation-report-editor";

export default async function SituationReportPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (!canAccessSituationReport(user)) {
    notFound();
  }

  const report = await getSituationReport(user);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide uppercase">
          Situation Report
        </h1>
      </div>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-xl">SITREP — {report.date}</CardTitle>
        </CardHeader>
        <CardContent>
          <SituationReportEditor initial={report} />
        </CardContent>
      </Card>
    </div>
  );
}

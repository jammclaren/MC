import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canAccessSituationReport, canWriteSituationReport } from "@/lib/rbac";
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
  const canWrite = canWriteSituationReport(user);

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print">
        <h1 className="font-display text-2xl font-bold tracking-wide uppercase">
          Daily Summary of Reports
        </h1>
      </div>

      <Card className="border-primary/30">
        <CardHeader className="no-print">
          <CardTitle className="text-xl">Daily Summary of Reports — {report.date}</CardTitle>
        </CardHeader>
        <CardContent>
          <SituationReportEditor initial={report} canWrite={canWrite} />
        </CardContent>
      </Card>
    </div>
  );
}

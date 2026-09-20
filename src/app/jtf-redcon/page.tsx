import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canAccessJtfRedcon } from "@/lib/rbac";
import { listUnitConditions } from "@/lib/queries/unit-conditions";
import { JtfRedconView } from "@/components/jtf-redcon-view";
import { NavCollapseToggle } from "@/components/nav-collapse-toggle";

export default async function JtfRedconPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (!canAccessJtfRedcon(user)) {
    notFound();
  }

  const groups = await listUnitConditions();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-2xl font-bold tracking-wide uppercase">JTF REDCON</h1>
        <NavCollapseToggle />
      </div>

      <JtfRedconView groups={groups} />
    </div>
  );
}

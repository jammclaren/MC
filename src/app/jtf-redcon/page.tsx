import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { canAccessJtfRedcon } from "@/lib/rbac";
import { listUnitConditions } from "@/lib/queries/unit-conditions";
import { JtfRedconView } from "@/components/jtf-redcon-view";
import { UnitConditionCard } from "@/components/unit-condition-card";
import { NavCollapseToggle } from "@/components/nav-collapse-toggle";

// Same role set assertCanWriteJtf allows to write — used here only to
// decide what to render (the editable card vs. the read-only view); the
// actual write is still re-checked server-side on save.
const WRITER_ROLES = ["ADMIN", "JTF_COMMANDER", "JTF_STAFF", "BRIGADE_STAFF"] as const;

export default async function JtfRedconPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (!canAccessJtfRedcon(user)) {
    notFound();
  }

  const groups = await listUnitConditions();
  const canWrite = (WRITER_ROLES as readonly string[]).includes(user.role);
  // ADMIN (jtfId === null) can write any JTF, so it keeps the full list;
  // a JTF-scoped writer only ever sees and edits their own JTF's card.
  const editableGroups = user.jtfId ? groups.filter((g) => g.jtfId === user.jtfId) : groups;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-2xl font-bold tracking-wide uppercase">JTF REDCON</h1>
        <NavCollapseToggle />
      </div>

      {canWrite ? <UnitConditionCard groups={editableGroups} /> : <JtfRedconView groups={groups} />}
    </div>
  );
}

import { getSessionUser } from "@/lib/session";
import { NavTopBar } from "@/components/nav-topbar";
import { prisma } from "@/lib/prisma";
import {
  canAccessIntelligenceUpdate,
  canAccessPage,
  canAccessSituationReport,
  canAccessSocialMonitor,
} from "@/lib/rbac";

async function pendingDeviceCount(): Promise<number> {
  return prisma.userDevice.count({ where: { status: "PENDING" } });
}

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/priority-map", label: "Situation Map", page: "situation-map" },
  { href: "/incidents", label: "Monitored Incidents" },
  { href: "/bpe-deployment", label: "Deployment", page: "deployment" },
  { href: "/election-ops", label: "Election Status", page: "election-status" },
  { href: "/election-board", label: "Election Profile", page: "election-profile" },
] as const;

const ADMIN_LINKS = [
  { href: "/admin/users", label: "Users", roles: ["ADMIN"] },
  { href: "/admin/audit-log", label: "Audit Log", roles: ["ADMIN"] },
] as const;

export async function Nav() {
  const user = await getSessionUser();
  if (!user) return null;

  const jtf = user.jtfId
    ? await prisma.jTF.findUnique({ where: { id: user.jtfId }, select: { name: true } })
    : null;

  const visibleNavLinks = NAV_LINKS.filter(
    (link) => !("page" in link) || canAccessPage(user, link.page)
  );
  const visibleAdminLinks = ADMIN_LINKS.filter((link) =>
    (link.roles as readonly string[]).includes(user.role)
  );
  const devicesPending = user.role === "ADMIN" ? await pendingDeviceCount() : 0;
  const allLinks = [
    ...visibleNavLinks.map((l) => ({ href: l.href, label: l.label })),
    ...(canAccessSocialMonitor(user)
      ? [{ href: "/social-monitor", label: "SOCMED" }]
      : []),
    ...(canAccessIntelligenceUpdate(user)
      ? [{ href: "/intel-update", label: "INTELLIGENCE" }]
      : []),
    ...(canAccessSituationReport(user)
      ? [{ href: "/situation-report", label: "Daily Summary of Reports" }]
      : []),
    ...visibleAdminLinks.map((l) => ({
      href: l.href,
      label: l.label,
      badgeCount: l.href === "/admin/users" ? devicesPending : undefined,
    })),
  ];

  const roleLine = `${user.role}${jtf ? ` · ${jtf.name.toUpperCase()}` : ""}${
    user.warfightingFunction ? ` · ${user.warfightingFunction.replaceAll("_", " ")}` : ""
  }`;

  return <NavTopBar links={allLinks} roleLine={roleLine} />;
}

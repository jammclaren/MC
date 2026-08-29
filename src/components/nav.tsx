import { getSessionUser } from "@/lib/session";
import { NavSidebar } from "@/components/nav-sidebar";
import { prisma } from "@/lib/prisma";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/priority-map", label: "Situation Map" },
  { href: "/bpe-deployment", label: "Deployment" },
  { href: "/incidents", label: "Monitored Incidents" },
  { href: "/election-ops", label: "Election Status" },
  { href: "/election-board", label: "Election Profile" },
] as const;

const ADMIN_LINKS = [
  { href: "/admin/users", label: "Users", roles: ["ADMIN"] },
  { href: "/admin/audit-log", label: "Audit Log", roles: ["ADMIN", "COMMAND"] },
] as const;

export async function Nav() {
  const user = await getSessionUser();
  if (!user) return null;

  const jtf = user.jtfId
    ? await prisma.jTF.findUnique({ where: { id: user.jtfId }, select: { name: true } })
    : null;

  const visibleAdminLinks = ADMIN_LINKS.filter((link) =>
    (link.roles as readonly string[]).includes(user.role)
  );
  const allLinks = [
    ...NAV_LINKS,
    ...visibleAdminLinks.map((l) => ({ href: l.href, label: l.label })),
  ];

  const roleLine = `${user.role}${jtf ? ` · ${jtf.name.toUpperCase()}` : ""}${
    user.warfightingFunction ? ` · ${user.warfightingFunction.replaceAll("_", " ")}` : ""
  }`;

  return <NavSidebar links={allLinks} roleLine={roleLine} />;
}

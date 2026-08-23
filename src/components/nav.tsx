import { getSessionUser } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";
import { NavLinks } from "@/components/nav-links";
import { LiveClock } from "@/components/live-clock";
import { prisma } from "@/lib/prisma";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/accomplishments", label: "Accomplishments" },
  { href: "/bpe-deployment", label: "BPE Deployment" },
  { href: "/priority-map", label: "Priority Map" },
  { href: "/incidents", label: "Incidents" },
  { href: "/election-ops", label: "Election Ops" },
  { href: "/election-board", label: "Election Board" },
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

  return (
    <header className="sticky top-0 z-40 border-b border-primary/20 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- small
                static header mark; not worth next/image's optimization
                pipeline for a 22KB, always-visible icon. */}
            <img
              src="/wesmincom-seal.png"
              alt="Western Mindanao Command seal"
              className="size-8"
            />
            <span className="flex size-2 rounded-full bg-status-good shadow-[0_0_6px_var(--status-good)]" />
            <span className="font-display text-base font-bold tracking-widest uppercase">
              WESMINCOM <span className="text-primary">DASHBOARD</span>
            </span>
          </div>
          <NavLinks links={allLinks} />
        </div>
        <div className="flex items-center gap-4">
          <LiveClock />
          <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
            {user.role}
            {jtf ? ` · ${jtf.name.toUpperCase()}` : ""}
            {user.warfightingFunction
              ? ` · ${user.warfightingFunction.replaceAll("_", " ")}`
              : ""}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

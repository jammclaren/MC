import { getSessionUser } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";
import { NavLinks } from "@/components/nav-links";
import { LiveClock } from "@/components/live-clock";
import { prisma } from "@/lib/prisma";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/bpe-deployment", label: "Deployment" },
  { href: "/priority-map", label: "Situation Map" },
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

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-primary/30 bg-background/95 shadow-[1px_0_16px_-4px_var(--primary)] backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- small
            static header mark; not worth next/image's optimization
            pipeline for a 22KB, always-visible icon. */}
        <img
          src="/wesmincom-seal.png"
          alt="Western Mindanao Command seal"
          className="size-8 shrink-0"
        />
        <span className="flex flex-col">
          <span className="font-display text-sm leading-tight font-bold tracking-widest uppercase">
            WESMINCOM
          </span>
          <span className="font-display text-sm leading-tight font-bold tracking-widest text-primary uppercase">
            Dashboard
          </span>
        </span>
        <span className="ml-auto flex size-2 rounded-full bg-status-good shadow-[0_0_6px_var(--status-good)]" />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavLinks links={allLinks} />
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-4 py-4">
        <LiveClock />
        <span className="font-mono text-xs text-muted-foreground">
          {user.role}
          {jtf ? ` · ${jtf.name.toUpperCase()}` : ""}
          {user.warfightingFunction
            ? ` · ${user.warfightingFunction.replaceAll("_", " ")}`
            : ""}
        </span>
        <SignOutButton />
      </div>
    </aside>
  );
}

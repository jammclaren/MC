import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/accomplishments", label: "Accomplishments" },
  { href: "/bpe-deployment", label: "BPE Deployment" },
  { href: "/priority-map", label: "Priority Map" },
  { href: "/incidents", label: "Incidents" },
  { href: "/election-ops", label: "Election Ops" },
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

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold tracking-tight">WESMINCOM C2</span>
          <nav className="flex items-center gap-4 text-sm">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-muted-foreground transition-colors hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
            {visibleAdminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            {user.role}
            {jtf ? ` · ${jtf.name}` : ""}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

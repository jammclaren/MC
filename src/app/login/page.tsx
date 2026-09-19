import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { LoginBackground } from "@/components/login-background";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const user = await getSessionUser();
  if (user) {
    redirect("/");
  }

  const { callbackUrl, error } = await searchParams;

  return (
    // `fixed inset-0` anchors this to the viewport directly rather than a
    // percentage of `main`'s height — `main`'s height is itself a used
    // flexbox value (flex-1 with no explicit height), which browsers don't
    // reliably treat as "definite" for a descendant's `height:100%` to
    // resolve against, so h-full here intermittently collapsed to the
    // content's own height instead of filling the viewport. LoginForm
    // positions its own trigger button and panel via `fixed`, so this
    // container no longer needs to center or offset anything itself.
    <div className="fixed inset-0 overflow-hidden">
      <LoginBackground />
      <LoginForm callbackUrl={callbackUrl ?? "/"} initialError={error} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const user = await getSessionUser();
  if (user) {
    redirect("/");
  }

  const { callbackUrl } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <LoginForm callbackUrl={callbackUrl ?? "/"} />
    </div>
  );
}

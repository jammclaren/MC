import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { TerrainContourBackground } from "@/components/terrain-contour-background";
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
    <div className="relative flex flex-1 items-center justify-center overflow-hidden p-6">
      <TerrainContourBackground />
      <div className="relative z-10">
        <LoginForm callbackUrl={callbackUrl ?? "/"} initialError={error} />
      </div>
    </div>
  );
}

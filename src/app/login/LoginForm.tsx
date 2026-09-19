"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Mode = "signin" | "signup";

function SignInFields({
  callbackUrl,
  initialError,
  onSwitchToSignUp,
}: {
  callbackUrl: string;
  initialError?: string;
  onSwitchToSignUp: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    initialError === "device_kicked" ? "This device's access was revoked by an administrator." : null
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setSubmitting(false);

    if (result?.error) {
      setError(
        result.code === "device_kicked"
          ? "This device's access was revoked by an administrator."
          : result.code === "device_limit_reached"
            ? "This account has reached its device login limit. Contact an administrator."
            : "Invalid email or password."
      );
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Username</Label>
        <Input
          id="email"
          type="text"
          inputMode="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() =>
            toast.info("Contact your administrator to reset your password.")
          }
          className="text-muted-foreground hover:text-foreground"
        >
          Forgot Password
        </button>
        <button
          type="button"
          onClick={onSwitchToSignUp}
          className="font-medium text-primary hover:underline"
        >
          Signup
        </button>
      </div>
      <Button
        type="submit"
        disabled={submitting}
        size="lg"
        className="mt-1 w-full shadow-[0_0_14px_-2px_var(--primary)] hover:shadow-[0_0_20px_-2px_var(--primary)]"
      >
        {submitting ? "Signing in..." : "Login"}
      </Button>
    </form>
  );
}

// Accounts on this system are provisioned by an ADMIN via User Management,
// not self-service — this form mirrors the reference design but never
// creates an account. Submitting it just points the visitor at the real
// path to get access.
function SignUpFields({ onSwitchToSignIn }: { onSwitchToSignIn: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setError(null);
    toast.info("Accounts are provisioned by an administrator. Contact yours for access.");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-name">Full name</Label>
        <Input
          id="signup-name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-confirm-password">Confirm password</Label>
        <Input
          id="signup-confirm-password"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="text-sm">
        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="text-muted-foreground hover:text-foreground"
        >
          Already have an account? <span className="font-medium text-primary">Sign In</span>
        </button>
      </div>
      <Button
        type="submit"
        size="lg"
        className="mt-1 w-full shadow-[0_0_14px_-2px_var(--primary)] hover:shadow-[0_0_20px_-2px_var(--primary)]"
      >
        Sign up
      </Button>
    </form>
  );
}

export function LoginForm({
  callbackUrl,
  initialError,
}: {
  callbackUrl: string;
  initialError?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const panelRef = useRef<HTMLDivElement>(null);

  // Click-outside-to-close, same pattern as a standard dropdown/popover.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed top-4 right-4 z-20 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground shadow-[0_0_14px_-2px_var(--primary)] transition-colors hover:bg-primary/80 sm:top-6 sm:right-6"
      >
        {open ? "Close" : "Sign In"}
      </button>
      {open && (
        <div
          ref={panelRef}
          className="fixed top-16 right-4 left-4 z-20 flex justify-end sm:top-16 sm:left-auto sm:right-6"
        >
          <Card className="login-card-in w-full max-w-sm bg-card/90 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-center text-2xl tracking-wide text-primary">
                {mode === "signin" ? "SIGN IN" : "SIGN UP"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mode === "signin" ? (
                <SignInFields
                  callbackUrl={callbackUrl}
                  initialError={initialError}
                  onSwitchToSignUp={() => setMode("signup")}
                />
              ) : (
                <SignUpFields onSwitchToSignIn={() => setMode("signin")} />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

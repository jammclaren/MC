"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLES = ["ADMIN", "COMMAND", "JTF_COMMANDER", "JTF_STAFF", "VIEWER"] as const;
type Role = (typeof ROLES)[number];

export interface JtfOption {
  id: string;
  name: string;
}

export interface UserFormInitial {
  id: string;
  name: string;
  role: Role;
  jtfId: string | null;
}

export function UserFormDialog({
  jtfOptions,
  initial,
  trigger,
}: {
  jtfOptions: JtfOption[];
  initial?: UserFormInitial;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const isEdit = !!initial;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(initial?.role ?? "JTF_STAFF");
  const [jtfId, setJtfId] = useState<string>(initial?.jtfId ?? "");

  const needsJtf = role === "JTF_COMMANDER" || role === "JTF_STAFF" || role === "VIEWER";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (needsJtf && !jtfId) {
      toast.error("Select a JTF for this role");
      return;
    }
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/admin/users/${initial!.id}` : "/api/admin/users";
      const method = isEdit ? "PATCH" : "POST";
      const body = isEdit
        ? {
            name,
            role,
            jtfId: needsJtf ? jtfId : null,
            ...(password ? { password } : {}),
          }
        : { name, email, password, role, jtfId: needsJtf ? jtfId : undefined };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      toast.success(isEdit ? "User updated" : "User created");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit User" : "Create User"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            {!isEdit && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">
                {isEdit ? "New password (leave blank to keep current)" : "Password"}
              </Label>
              <Input
                id="password"
                type="password"
                required={!isEdit}
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v: string | null) => v && setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {needsJtf && (
              <div className="flex flex-col gap-2">
                <Label>JTF</Label>
                <Select value={jtfId} onValueChange={(v: string | null) => setJtfId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select JTF" />
                  </SelectTrigger>
                  <SelectContent>
                    {jtfOptions.map((jtf) => (
                      <SelectItem key={jtf.id} value={jtf.id}>
                        {jtf.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserFormDialog, type JtfOption, type UserFormInitial } from "@/components/user-form-dialog";
import { DeleteButton } from "@/components/delete-button";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserFormInitial["role"];
  jtfId: string | null;
  jtfName: string | null;
  warfightingFunction: UserFormInitial["warfightingFunction"];
  createdAtLabel: string;
  deviceLoginCount: number;
  maxDevices: number | null;
}

const ALL_FUNCTIONS_VALUE = "__all__";
const NONE_VALUE = "__none__";

function functionLabel(row: UserRow): string {
  return row.jtfName ?? row.warfightingFunction?.replaceAll("_", " ") ?? "—";
}

export function UsersTable({
  users,
  jtfOptions,
  currentUserId,
}: {
  users: UserRow[];
  jtfOptions: JtfOption[];
  currentUserId: string;
}) {
  const [fn, setFn] = useState(ALL_FUNCTIONS_VALUE);

  const functions = useMemo(
    () => Array.from(new Set(users.map(functionLabel).filter((f) => f !== "—"))).sort(),
    [users]
  );

  const functionItems = useMemo(
    () => [
      { value: ALL_FUNCTIONS_VALUE, label: "All Functions" },
      ...functions.map((f) => ({ value: f, label: f })),
      { value: NONE_VALUE, label: "None" },
    ],
    [functions]
  );

  const filtered = useMemo(() => {
    const scoped =
      fn === ALL_FUNCTIONS_VALUE
        ? users
        : fn === NONE_VALUE
          ? users.filter((u) => functionLabel(u) === "—")
          : users.filter((u) => functionLabel(u) === fn);

    return scoped
      .slice()
      .sort((a, b) => functionLabel(a).localeCompare(functionLabel(b)) || a.name.localeCompare(b.name));
  }, [users, fn]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter by function:</span>
        <Select items={functionItems} value={fn} onValueChange={(v) => setFn(v ?? ALL_FUNCTIONS_VALUE)}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FUNCTIONS_VALUE}>All Functions</SelectItem>
            {functions.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
            <SelectItem value={NONE_VALUE}>None</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>JTF / Function</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Device Logins</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.email}</TableCell>
              <TableCell>{row.role}</TableCell>
              <TableCell>{functionLabel(row)}</TableCell>
              <TableCell>{row.createdAtLabel}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {row.deviceLoginCount}
                {row.maxDevices != null && (
                  <span className="text-muted-foreground"> / {row.maxDevices}</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <UserFormDialog
                    jtfOptions={jtfOptions}
                    initial={{
                      id: row.id,
                      name: row.name,
                      role: row.role,
                      jtfId: row.jtfId,
                      warfightingFunction: row.warfightingFunction,
                      maxDevices: row.maxDevices,
                    }}
                    trigger={
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    }
                  />
                  {row.id !== currentUserId && (
                    <DeleteButton
                      url={`/api/admin/users/${row.id}`}
                      confirmMessage={`Delete user ${row.name}? This cannot be undone.`}
                    />
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No accounts match this filter.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

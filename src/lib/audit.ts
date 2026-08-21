import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

type AuditAction = "CREATE" | "UPDATE" | "DELETE";

type AuditParams<T> = {
  userId: string;
  action: AuditAction;
  entity: string;
  /** Either a known id (UPDATE/DELETE) or a function deriving it from the
   * write's own result (CREATE, where the id doesn't exist beforehand). */
  entityId: string | ((result: T) => string);
  diff?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
};

/**
 * Every mutating write in this app goes through this wrapper so a matching
 * AuditLog row is always written in the same transaction as the change
 * (SPEC.md §7: "Every write goes through a single service function that
 * also writes an AuditLog row in the same transaction").
 */
export async function withAudit<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  params: AuditParams<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const result = await fn(tx);
    const entityId =
      typeof params.entityId === "function"
        ? params.entityId(result)
        : params.entityId;
    await tx.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId,
        diff: params.diff,
      },
    });
    return result;
  });
}

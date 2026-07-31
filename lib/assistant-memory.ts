import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Storage for the admin assistant's short-term memory and its pending
 * confirmation tokens.
 *
 * History: these rows used to be written into `contact_messages` with magic
 * `subject` values. That mixed internal state into the public inbox and — because
 * the public contact form lets the caller choose `subject` — allowed anonymous
 * visitors to inject text straight into the assistant's context. They now live in
 * their own `assistant_memory` table.
 */

/**
 * Subjects that used to be used for internal rows. Still referenced so that
 * (a) the public contact form rejects them, and (b) inbox queries can hide any
 * legacy rows left in `contact_messages` from before the migration.
 */
export const RESERVED_MESSAGE_SUBJECTS = ["__assistant_memory__", "__assistant_action__"] as const;

export type ToolActionType = "publish" | "delete";

export type PendingToolAction = {
  token: string;
  type: ToolActionType;
  target: string;
  createdAt: string;
};

/** Tool-action tokens authorize destructive operations, so use a CSPRNG. */
export function createActionToken() {
  return randomBytes(6).toString("hex"); // 12 hex chars, 48 bits
}

export async function saveAssistantMessage(role: "user" | "assistant", content: string) {
  await prisma.assistantMemory.create({
    data: { kind: "message", role, content },
  });
}

export async function getRecentAssistantMessages(take = 10) {
  const rows = await prisma.assistantMemory.findMany({
    where: { kind: "message" },
    orderBy: { createdAt: "desc" },
    take,
    select: { role: true, content: true, createdAt: true },
  });
  return rows.reverse();
}

export async function queueToolAction(type: ToolActionType, target: string) {
  const token = createActionToken();
  await prisma.assistantMemory.create({
    data: {
      kind: "action",
      token,
      actionType: type,
      target,
      content: `${type} ${target}`,
    },
  });
  return token;
}

const ACTION_TTL_MS = 10 * 60 * 1000; // a confirmation token is valid for 10 minutes

export async function findPendingToolAction(token: string): Promise<PendingToolAction | null> {
  const row = await prisma.assistantMemory.findUnique({ where: { token } });

  if (!row || row.kind !== "action" || row.consumedAt) return null;
  if (!row.actionType || !row.target) return null;
  if (Date.now() - row.createdAt.getTime() > ACTION_TTL_MS) return null;

  return {
    token,
    type: row.actionType as ToolActionType,
    target: row.target,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Marks the token as used. Returns false when it was already consumed, so a
 * replayed `/confirm` cannot execute the same destructive action twice.
 */
export async function consumePendingToolAction(token: string) {
  const result = await prisma.assistantMemory.updateMany({
    where: { token, kind: "action", consumedAt: null },
    data: { consumedAt: new Date() },
  });
  return result.count > 0;
}

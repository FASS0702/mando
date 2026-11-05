import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, runs, approvals, tasks, heartbeats } from "@/db";
import { requireAgentToken } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";


const RunInput = z.object({
  agent_id: z.string().min(1),
  task_id: z.string().uuid().optional(),
  status: z.enum(["ok", "fail"]),
  started_at: z.string().datetime({ offset: true }).optional(),
  duration_s: z.number().nonnegative().optional(),
  cost_usd: z.number().nonnegative().optional(),
  summary: z.string().max(4000).optional(),
  output_ref: z.string().max(1000).optional(),
  error: z.string().max(4000).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  worker: z.string().optional(),
  approval: z
    .object({
      kind: z.enum(["post", "email", "deploy", "other"]),
      title: z.string().min(1).max(300),
      content: z.string().max(20000).optional(),
    })
    .optional(),
});

/** POST /api/runs: un agente o worker reporta una ejecución terminada. */
export async function POST(req: NextRequest) {
  const denied = requireAgentToken(req);
  if (denied) return denied;

  const parsed = RunInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const b = parsed.data;

  const [run] = await db
    .insert(runs)
    .values({
      agentId: b.agent_id,
      taskId: b.task_id,
      status: b.status,
      startedAt: b.started_at ? new Date(b.started_at) : null,
      durationS: b.duration_s?.toString(),
      costUsd: b.cost_usd?.toString(),
      summary: b.summary,
      outputRef: b.output_ref,
      error: b.error,
      needsApproval: Boolean(b.approval),
      meta: b.meta ?? {},
    })
    .returning({ id: runs.id });

  let approvalId: string | null = null;
  if (b.approval) {
    const [a] = await db
      .insert(approvals)
      .values({ runId: run.id, agentId: b.agent_id, ...b.approval })
      .returning({ id: approvals.id });
    approvalId = a.id;
  }

  if (b.task_id) {
    await db
      .update(tasks)
      .set({ status: b.status === "ok" ? "done" : "failed", updatedAt: new Date() })
      .where(eq(tasks.id, b.task_id));
  }

  if (b.worker) {
    await db
      .insert(heartbeats)
      .values({ worker: b.worker, lastSeen: new Date() })
      .onConflictDoUpdate({ target: heartbeats.worker, set: { lastSeen: new Date() } });
  }

  return NextResponse.json({ run_id: run.id, approval_id: approvalId }, { status: 201 });
}

/** GET /api/runs?limit=50 */
export async function GET(req: NextRequest) {
  const denied = requireAgentToken(req);
  if (denied) return denied;
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50), 200);
  const rows = await db.select().from(runs).orderBy(desc(runs.finishedAt)).limit(limit);
  return NextResponse.json(rows);
}

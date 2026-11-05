import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, tasks, heartbeats } from "@/db";
import { requireAgentToken } from "@/lib/auth";
import { and, asc, eq, sql } from "drizzle-orm";


const Input = z.object({ worker: z.string().min(1).max(64), runtime: z.enum(["local", "cloud", "kaivok"]).default("local") });

/**
 * POST /api/tasks/next: el worker reclama la siguiente tarea en cola para su runtime.
 * Reclamo atómico: UPDATE ... WHERE status='queued' con SKIP LOCKED.
 */
export async function POST(req: NextRequest) {
  const denied = requireAgentToken(req);
  if (denied) return denied;
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { worker, runtime: rt } = parsed.data;

  await db
    .insert(heartbeats)
    .values({ worker, lastSeen: new Date() })
    .onConflictDoUpdate({ target: heartbeats.worker, set: { lastSeen: new Date() } });

  const claimed = await db.execute(sql`
    update mando.tasks set status = 'running', claimed_by = ${worker}, claimed_at = now(), updated_at = now()
    where id = (
      select id from mando.tasks
      where status = 'queued' and runtime = ${rt}
      order by created_at asc
      for update skip locked
      limit 1
    )
    returning id, agent_id, title, prompt, origin, payload
  `);

  const row = (claimed as unknown as { rows?: unknown[] }).rows?.[0] ?? (Array.isArray(claimed) ? claimed[0] : undefined);
  if (!row) return new NextResponse(null, { status: 204 });
  return NextResponse.json(row);
}

/** GET /api/tasks/next: vista de lo que hay en cola (sin reclamar). */
export async function GET(req: NextRequest) {
  const denied = requireAgentToken(req);
  if (denied) return denied;
  const rows = await db
    .select({ id: tasks.id, agentId: tasks.agentId, title: tasks.title, runtime: tasks.runtime })
    .from(tasks)
    .where(and(eq(tasks.status, "queued")))
    .orderBy(asc(tasks.createdAt))
    .limit(20);
  return NextResponse.json(rows);
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, tasks } from "@/db";
import { requireAgentToken, requireSession } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";


const Input = z.object({
  agent_id: z.string().min(1),
  title: z.string().min(1).max(300),
  prompt: z.string().max(20000).optional(),
  origin: z.enum(["manual", "scheduled", "automation"]).default("manual"),
  runtime: z.enum(["local", "cloud", "kaivok"]).default("local"),
  idempotency_key: z.string().max(200).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

/** POST /api/tasks: encola una tarea (desde el tablero con sesión, o desde un agente con token). */
export async function POST(req: NextRequest) {
  if (requireAgentToken(req) && requireSession(req)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const b = parsed.data;
  const [t] = await db
    .insert(tasks)
    .values({
      agentId: b.agent_id,
      title: b.title,
      prompt: b.prompt,
      origin: b.origin,
      runtime: b.runtime,
      idempotencyKey: b.idempotency_key,
      payload: b.payload ?? {},
    })
    .onConflictDoNothing({ target: tasks.idempotencyKey })
    .returning({ id: tasks.id });
  if (!t) return NextResponse.json({ duplicate: true }, { status: 200 });
  return NextResponse.json({ task_id: t.id }, { status: 201 });
}

/** GET /api/tasks?status=queued */
export async function GET(req: NextRequest) {
  const denied = requireAgentToken(req);
  if (denied) return denied;
  const status = req.nextUrl.searchParams.get("status");
  const rows = await db
    .select()
    .from(tasks)
    .where(status ? eq(tasks.status, status) : undefined)
    .orderBy(desc(tasks.createdAt))
    .limit(100);
  return NextResponse.json(rows);
}

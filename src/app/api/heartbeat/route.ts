import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, heartbeats } from "@/db";
import { requireAgentToken } from "@/lib/auth";


const Input = z.object({ worker: z.string().min(1).max(64), info: z.record(z.string(), z.unknown()).optional() });

/** POST /api/heartbeat: latido de un worker o runtime. */
export async function POST(req: NextRequest) {
  const denied = requireAgentToken(req);
  if (denied) return denied;
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { worker, info } = parsed.data;
  await db
    .insert(heartbeats)
    .values({ worker, lastSeen: new Date(), info: info ?? {} })
    .onConflictDoUpdate({ target: heartbeats.worker, set: { lastSeen: new Date(), ...(info ? { info } : {}) } });
  return NextResponse.json({ ok: true });
}

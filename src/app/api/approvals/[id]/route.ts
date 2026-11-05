import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, approvals } from "@/db";
import { requireAgentToken, requireSession } from "@/lib/auth";
import { eq } from "drizzle-orm";


const Input = z.object({
  decision: z.enum(["approved", "rejected", "changes"]),
  note: z.string().max(2000).optional(),
});

/** POST /api/approvals/:id: decisión desde el tablero (sesión) o, si hiciera falta, desde un agente (token). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (requireSession(req) && requireAgentToken(req)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const [row] = await db
    .update(approvals)
    .set({ status: parsed.data.decision, decisionNote: parsed.data.note, decidedAt: new Date() })
    .where(eq(approvals.id, id))
    .returning({ id: approvals.id, status: approvals.status });
  if (!row) return NextResponse.json({ error: "no existe" }, { status: 404 });
  return NextResponse.json(row);
}

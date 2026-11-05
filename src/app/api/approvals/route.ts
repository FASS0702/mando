import { NextRequest, NextResponse } from "next/server";
import { db, approvals } from "@/db";
import { requireAgentToken } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";


/** GET /api/approvals?status=approved&agent_id=brand: los agentes consultan qué decidió Felipe. */
export async function GET(req: NextRequest) {
  const denied = requireAgentToken(req);
  if (denied) return denied;
  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  const agentId = req.nextUrl.searchParams.get("agent_id");
  const rows = await db
    .select()
    .from(approvals)
    .where(agentId ? eq(approvals.agentId, agentId) : undefined)
    .orderBy(desc(approvals.createdAt))
    .limit(100);
  return NextResponse.json(rows.filter((r) => r.status === status));
}

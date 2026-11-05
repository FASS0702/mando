import { db, agents, runs, tasks, approvals, heartbeats } from "@/db";
import { and, desc, eq, gte, sql } from "drizzle-orm";

const DAY = 24 * 3600 * 1000;

export async function getDashboard() {
  const since24h = new Date(Date.now() - DAY);
  const since30d = new Date(Date.now() - 30 * DAY);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [agentRows, recentRuns, pendingApprovals, taskRows, hb, stats24, costMonth, lastRunByAgent] =
    await Promise.all([
      db.select().from(agents).orderBy(agents.id),
      db.select().from(runs).orderBy(desc(runs.finishedAt)).limit(12),
      db.select().from(approvals).where(eq(approvals.status, "pending")).orderBy(desc(approvals.createdAt)),
      db.select().from(tasks).orderBy(desc(tasks.createdAt)).limit(30),
      db.select().from(heartbeats),
      db
        .select({
          total: sql<number>`count(*)::int`,
          ok: sql<number>`count(*) filter (where ${runs.status} = 'ok')::int`,
          fail: sql<number>`count(*) filter (where ${runs.status} = 'fail')::int`,
        })
        .from(runs)
        .where(gte(runs.finishedAt, since24h)),
      db
        .select({ cost: sql<string>`coalesce(sum(${runs.costUsd}), 0)::text`, n: sql<number>`count(*)::int` })
        .from(runs)
        .where(gte(runs.finishedAt, monthStart)),
      db
        .select({
          agentId: runs.agentId,
          last: sql<string>`max(${runs.finishedAt})::text`,
          lastStatus: sql<string>`(array_agg(${runs.status} order by ${runs.finishedAt} desc))[1]`,
          runs30d: sql<number>`count(*) filter (where ${runs.finishedAt} >= ${since30d})::int`,
        })
        .from(runs)
        .groupBy(runs.agentId),
    ]);

  const lastMap = new Map(lastRunByAgent.map((r) => [r.agentId, r]));
  const agentsView = agentRows.map((a) => {
    const l = lastMap.get(a.id);
    const idle30 = !l || l.runs30d === 0;
    return {
      ...a,
      lastRunAt: l?.last ?? null,
      lastStatus: l?.lastStatus ?? null,
      runs30d: l?.runs30d ?? 0,
      suggestion: a.status === "retired" ? "retirado" : idle30 ? "sin uso 30 días" : null,
    };
  });

  const workers = hb.map((h) => ({
    ...h,
    alive: Date.now() - new Date(h.lastSeen).getTime() < 3 * 60 * 1000,
    minutesAgo: Math.round((Date.now() - new Date(h.lastSeen).getTime()) / 60000),
  }));

  return {
    agents: agentsView,
    recentRuns,
    pendingApprovals,
    tasks: taskRows,
    workers,
    stats24: stats24[0] ?? { total: 0, ok: 0, fail: 0 },
    costMonth: { usd: Number(costMonth[0]?.cost ?? 0), runs: costMonth[0]?.n ?? 0 },
    queued: taskRows.filter((t) => t.status === "queued").length,
    running: taskRows.filter((t) => t.status === "running").length,
  };
}

export async function getAgentDetail(id: string) {
  const [agent] = await db.select().from(agents).where(eq(agents.id, id));
  if (!agent) return null;
  const agentRuns = await db
    .select()
    .from(runs)
    .where(and(eq(runs.agentId, id)))
    .orderBy(desc(runs.finishedAt))
    .limit(50);
  return { agent, runs: agentRuns };
}

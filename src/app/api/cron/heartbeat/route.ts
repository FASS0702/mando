import { NextRequest, NextResponse } from "next/server";
import { db, heartbeats } from "@/db";


/** Cron de Vercel: latido del runtime cloud. Protegido por CRON_SECRET (Vercel lo manda como Bearer). */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (expected && req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  await db
    .insert(heartbeats)
    .values({ worker: "vercel", lastSeen: new Date() })
    .onConflictDoUpdate({ target: heartbeats.worker, set: { lastSeen: new Date() } });
  return NextResponse.json({ ok: true });
}

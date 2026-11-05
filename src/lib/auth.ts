import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "mando_session";

function secret() {
  const s = process.env.MANDO_SESSION_SECRET;
  if (!s) throw new Error("MANDO_SESSION_SECRET no definida");
  return s;
}

export function makeSessionToken() {
  const ts = Date.now().toString();
  const sig = createHmac("sha256", secret()).update(ts).digest("hex");
  return `${ts}.${sig}`;
}

export function verifySessionToken(token: string | undefined, maxAgeMs = 30 * 24 * 3600 * 1000) {
  if (!token) return false;
  const [ts, sig] = token.split(".");
  if (!ts || !sig) return false;
  const expected = createHmac("sha256", secret()).update(ts).digest("hex");
  if (sig.length !== expected.length) return false;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  return Date.now() - Number(ts) < maxAgeMs;
}

/** Token compartido para agentes y worker: Authorization: Bearer <MANDO_AGENT_TOKEN> */
export function requireAgentToken(req: NextRequest): NextResponse | null {
  const expected = process.env.MANDO_AGENT_TOKEN;
  if (!expected) return NextResponse.json({ error: "MANDO_AGENT_TOKEN no configurado" }, { status: 500 });
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token.length !== expected.length || !timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  return null;
}

/** Sesión de UI (cookie) para acciones desde el tablero */
export function requireSession(req: NextRequest): NextResponse | null {
  const ok = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  return ok ? null : NextResponse.json({ error: "sesión inválida" }, { status: 401 });
}

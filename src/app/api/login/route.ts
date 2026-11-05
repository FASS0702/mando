import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { SESSION_COOKIE, makeSessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/");
  const expected = process.env.MANDO_PASSWORD ?? "";
  const ok =
    expected.length > 0 &&
    password.length === expected.length &&
    timingSafeEqual(Buffer.from(password), Buffer.from(expected));
  if (!ok) {
    return NextResponse.redirect(new URL(`/login?error=1&next=${encodeURIComponent(next)}`, req.url), 303);
  }
  const res = NextResponse.redirect(new URL(next.startsWith("/") ? next : "/", req.url), 303);
  res.cookies.set(SESSION_COOKIE, makeSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 3600,
  });
  return res;
}

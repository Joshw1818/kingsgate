import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const leadSchema = z.object({
  name: z.string().min(2).max(120),
  company: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z.string().min(5).max(40),
  location: z.string().min(2).max(200),
  checkIn: z.string().min(1).max(40),
  nights: z.coerce.number().int().min(1).max(3650),
  headcount: z.coerce.number().int().min(1).max(1000),
  notes: z.string().max(2000).optional().default(""),
});

const buckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = buckets.get(ip);
  if (!entry || entry.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_PER_WINDOW) return false;
  entry.count += 1;
  return true;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!rateLimit(ip)) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "validation", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const payload = {
    ...parsed.data,
    source: "lp-housd",
    submittedAt: new Date().toISOString(),
    userAgent: request.headers.get("user-agent") ?? "",
    referer: request.headers.get("referer") ?? "",
    ip,
  };

  const webhookUrl = process.env.HOUSD_GHL_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[lp-housd] HOUSD_GHL_WEBHOOK_URL not set — logging only", {
      name: payload.name,
      email: payload.email,
      company: payload.company,
    });
    return NextResponse.json({ ok: true, forwarded: false });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[lp-housd] GHL webhook non-2xx", res.status, text);
      return NextResponse.json(
        { ok: false, error: "webhook_failed", status: res.status },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, forwarded: true });
  } catch (err) {
    console.error("[lp-housd] GHL webhook error", err);
    return NextResponse.json(
      { ok: false, error: "webhook_error" },
      { status: 502 },
    );
  }
}

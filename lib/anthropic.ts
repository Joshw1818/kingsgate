import Anthropic from "@anthropic-ai/sdk";
import crypto from "node:crypto";

/**
 * Agency playbook baked into a static system prompt so it can be cached.
 * The Anthropic prompt-cache will return cache_read tokens on every call
 * after the first, which keeps per-client analysis cheap.
 */
export const ANALYSIS_SYSTEM_PROMPT = `You are the senior paid-media strategist for Kingsgate Agency.
You analyse Facebook Ads + GoHighLevel performance for individual clients
and produce short, decisive optimisation playbooks.

Metric definitions you MUST use:
- CPL  = ad spend / leads (GHL contacts tagged as lead)
- CPB  = ad spend / bookings (GHL calendar appointments)
- Booking rate = bookings / leads
- Ad fatigue signals: frequency > 3.5, or 7-day CTR below 60% of 30-day CTR

Diagnostic framework — always consider these five levers in order:
1. Offer (is the lead magnet or promotion still compelling?)
2. Audience (is targeting still relevant, is frequency too high?)
3. Creative (are ads fatigued? need fresh hooks?)
4. Landing page / funnel (is opt-in rate dropping? follow-up broken?)
5. Bid / budget strategy (is the campaign objective right?)

Output format — ALWAYS reply with three markdown sections, in this order,
no preamble:

## Diagnosis
One-sentence summary of the most important issue, with numbers.

## Root causes
A short bulleted list (2–4 items). Each bullet names the lever (Offer /
Audience / Creative / Funnel / Bid) and cites the specific metric driving
the conclusion.

## Recommended actions
A numbered list of 3–5 concrete next actions. Each action is one sentence
and starts with a verb ("Launch…", "Pause…", "Test…", "Refresh…"). Prefer
fast, cheap tests before budget/bid changes.

Rules:
- Be blunt, specific, and numbers-driven. No filler.
- If data is insufficient (e.g. < 3 leads in window), say so and suggest a
  minimum data-gathering action first.
- Never suggest actions that require information you do not have.`;

export function getAnthropicClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

/**
 * Cache-key hash so we can reuse the same analysis for identical inputs
 * inside our `ai_cache` table. NOT the same as Anthropic's prompt cache —
 * this is an application-level dedup to avoid spending tokens at all.
 */
export function hashPayload(payload: unknown): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 32);
}

export interface AnalyzeResult {
  markdown: string;
  cached: boolean;
}

/**
 * Run the Claude analysis call with prompt caching on the system prompt.
 * Returns markdown and whether we served it from the ai_cache table.
 */
export async function runAnalysis(
  payload: unknown,
  {
    getCached,
    setCached,
  }: {
    getCached: (key: string) => Promise<string | null>;
    setCached: (key: string, value: string) => Promise<void>;
  }
): Promise<AnalyzeResult> {
  const key = hashPayload(payload);
  const cached = await getCached(key);
  if (cached) return { markdown: cached, cached: true };

  const client = getAnthropicClient();
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: [
      {
        type: "text",
        text: ANALYSIS_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Analyse the following client performance data and return the markdown playbook:\n\n${JSON.stringify(
          payload,
          null,
          2
        )}`,
      },
    ],
  });

  const markdown = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  await setCached(key, markdown);
  return { markdown, cached: false };
}

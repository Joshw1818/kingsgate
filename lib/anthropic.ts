import Anthropic from "@anthropic-ai/sdk";
import crypto from "node:crypto";
import {
  DEEP_ANALYSIS_INPUT_SCHEMA,
  DeepAnalysisSchema,
  type DeepAnalysis,
} from "./ai/schema";
import { DEEP_ANALYSIS_SYSTEM_PROMPT } from "./ai/prompts";

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

// ------------------------------------------------------------------
// Deep analysis: the "smarter" path. Uses tool-use to enforce the
// structured DeepAnalysis schema, extended thinking for harder
// diagnoses, and optional vision on creative thumbnails.
// ------------------------------------------------------------------

export interface DeepAnalysisResult {
  analysis: DeepAnalysis;
  cached: boolean;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

export interface DeepAnalysisOptions {
  payload: unknown;                  // serialised KPI + ad-level data
  creativeImageUrls?: string[];      // up to 5 top-spend thumbnails
  getCached?: (key: string) => Promise<DeepAnalysis | null>;
  setCached?: (key: string, value: DeepAnalysis) => Promise<void>;
}

export async function runDeepAnalysis(
  opts: DeepAnalysisOptions
): Promise<DeepAnalysisResult> {
  const cacheKey = hashPayload({
    payload: opts.payload,
    images: opts.creativeImageUrls ?? [],
  });

  if (opts.getCached) {
    const cached = await opts.getCached(cacheKey);
    if (cached) return { analysis: cached, cached: true };
  }

  const client = getAnthropicClient();

  // Build the multimodal user message: images interleaved with text
  // labels, followed by the full JSON payload as the authoritative data.
  const content: Anthropic.ContentBlockParam[] = [];
  const images = opts.creativeImageUrls ?? [];
  if (images.length > 0) {
    content.push({
      type: "text",
      text: "Top-spending creative thumbnails (in rank order):",
    });
    for (let i = 0; i < images.length; i++) {
      content.push({
        type: "text",
        text: `Creative #${i + 1}:`,
      });
      content.push({
        type: "image",
        source: { type: "url", url: images[i] },
      });
    }
  }
  content.push({
    type: "text",
    text: `Full client performance dataset:\n\`\`\`json\n${JSON.stringify(
      opts.payload,
      null,
      2
    )}\n\`\`\`\n\nNow call emit_analysis with your diagnosis.`,
  });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    thinking: { type: "enabled", budget_tokens: 2000 },
    system: [
      {
        type: "text",
        text: DEEP_ANALYSIS_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [
      {
        name: "emit_analysis",
        description:
          "Emit the structured analysis for this client. You MUST call this tool exactly once with a valid payload; no free-form text responses are allowed.",
        input_schema: DEEP_ANALYSIS_INPUT_SCHEMA as Anthropic.Tool.InputSchema,
        cache_control: { type: "ephemeral" },
      },
    ],
    tool_choice: { type: "tool", name: "emit_analysis" },
    messages: [{ role: "user", content }],
  });

  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error(
      "Claude did not return a tool_use block; cannot parse deep analysis."
    );
  }

  const parsed = DeepAnalysisSchema.parse(toolUse.input);

  if (opts.setCached) await opts.setCached(cacheKey, parsed);

  return {
    analysis: parsed,
    cached: false,
    usage: {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      cache_read_input_tokens: message.usage.cache_read_input_tokens ?? 0,
      cache_creation_input_tokens:
        message.usage.cache_creation_input_tokens ?? 0,
    },
  };
}

// ------------------------------------------------------------------
// Chat follow-up: keeps the structured analysis as context and lets
// the user ask free-form questions. Returns a streaming response.
// ------------------------------------------------------------------

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export async function streamAnalysisChat(opts: {
  analysis: DeepAnalysis;
  history: ChatTurn[];
  userMessage: string;
}): Promise<ReadableStream<Uint8Array>> {
  const client = getAnthropicClient();

  const contextBlock = `Previously emitted structured analysis:\n\`\`\`json\n${JSON.stringify(
    opts.analysis,
    null,
    2
  )}\n\`\`\``;

  const stream = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1200,
    system: [
      {
        type: "text",
        text:
          DEEP_ANALYSIS_SYSTEM_PROMPT +
          "\n\n# Chat mode\n" +
          "You are now answering follow-up questions about the analysis you " +
          "emitted earlier. Reply in conversational prose (no tool call). " +
          "Stay grounded in the metrics and ad ids from the analysis. " +
          "Be concise — 1 to 4 short paragraphs. Use bullet points only " +
          "when listing actions or metrics.",
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      { role: "user", content: contextBlock },
      {
        role: "assistant",
        content: "Understood. Ask me anything about this analysis.",
      },
      ...opts.history.map((t) => ({ role: t.role, content: t.content })),
      { role: "user", content: opts.userMessage },
    ],
    stream: true,
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { streamAnalysisChat, type ChatTurn } from "@/lib/anthropic";
import { DeepAnalysisSchema, type DeepAnalysis } from "@/lib/ai/schema";
import { DEMO_DEEP_ANALYSIS, getDemoChatResponse, isDemoMode } from "@/lib/demo";

const BodySchema = z.object({
  client_id: z.string(),
  conversation_id: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .default([]),
  user_message: z.string().min(1),
  analysis: z.unknown().optional(),
});

export async function POST(request: Request) {
  const body = BodySchema.parse(await request.json());

  // ----- Demo mode: stream a canned response ----------------------
  if (isDemoMode()) {
    const text = getDemoChatResponse(body.user_message);
    return new Response(chunkStream(text), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // ----- Live mode: auth + real Claude streaming -----------------
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // The analysis must be provided by the client-side (fetched from
  // /api/analyze earlier). This keeps this route stateless and avoids
  // a DB round-trip for every keystroke.
  let analysis: DeepAnalysis;
  try {
    analysis = DeepAnalysisSchema.parse(body.analysis);
  } catch {
    return new Response(
      "Missing or invalid `analysis` in request body. Call /api/analyze first.",
      { status: 400 }
    );
  }

  const history: ChatTurn[] = body.history;

  const stream = await streamAnalysisChat({
    analysis,
    history,
    userMessage: body.user_message,
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * Demo-mode helper: turn a static string into a pseudo-stream so the
 * client sees the "typing" effect just like in live mode.
 */
function chunkStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const words = text.split(/(\s+)/);
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i >= words.length) {
        controller.close();
        return;
      }
      // Emit ~2 words at a time for a smooth cadence
      const chunk = words.slice(i, i + 2).join("");
      i += 2;
      controller.enqueue(encoder.encode(chunk));
      return new Promise<void>((res) => setTimeout(res, 15));
    },
  });
}

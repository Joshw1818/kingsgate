import { z } from "zod";

/**
 * The structured output Claude must return for a client analysis.
 * Enforced via tool-use (`emit_analysis`) so we never have to parse
 * JSON-in-markdown. The same shape is rendered differently for the
 * internal CEO view vs. the client-facing report.
 */

export const LEVERS = [
  "offer",
  "audience",
  "creative",
  "funnel",
  "bid",
] as const;
export type Lever = (typeof LEVERS)[number];

export const SEVERITIES = ["critical", "watch", "healthy"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const PRIORITIES = ["P0", "P1", "P2"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const CONFIDENCES = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCES)[number];

export const EvidenceSchema = z.object({
  metric: z.string(),
  value: z.union([z.number(), z.string()]),
  context: z.string(),
});

export const RootCauseSchema = z.object({
  lever: z.enum(LEVERS),
  hypothesis: z.string(),
  evidence: z.array(EvidenceSchema).min(1).max(4),
  confidence: z.enum(CONFIDENCES),
});

export const ActionSchema = z.object({
  priority: z.enum(PRIORITIES),
  verb: z.string(),
  description: z.string(),
  expected_impact: z.string(),
  affected_ad_ids: z.array(z.string()).optional(),
});

export const ClientNarrativeSchema = z.object({
  summary: z.string(),
  wins: z.array(z.string()),
  focus_areas: z.array(z.string()),
  next_steps: z.array(z.string()),
});

export const DeepAnalysisSchema = z.object({
  headline_diagnosis: z.string(),
  severity: z.enum(SEVERITIES),
  root_causes: z.array(RootCauseSchema).min(1).max(5),
  actions: z.array(ActionSchema).min(3).max(6),
  client_narrative: ClientNarrativeSchema,
});

export type Evidence = z.infer<typeof EvidenceSchema>;
export type RootCause = z.infer<typeof RootCauseSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type ClientNarrative = z.infer<typeof ClientNarrativeSchema>;
export type DeepAnalysis = z.infer<typeof DeepAnalysisSchema>;

/**
 * JSON Schema version of `DeepAnalysisSchema` for Anthropic tool-use.
 * Handwritten so we don't pull in another dep just for this conversion.
 */
export const DEEP_ANALYSIS_INPUT_SCHEMA = {
  type: "object" as const,
  required: [
    "headline_diagnosis",
    "severity",
    "root_causes",
    "actions",
    "client_narrative",
  ],
  properties: {
    headline_diagnosis: {
      type: "string",
      description:
        "One-sentence summary of the most important issue, numbers-driven.",
    },
    severity: {
      type: "string",
      enum: ["critical", "watch", "healthy"],
    },
    root_causes: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        required: ["lever", "hypothesis", "evidence", "confidence"],
        properties: {
          lever: {
            type: "string",
            enum: ["offer", "audience", "creative", "funnel", "bid"],
          },
          hypothesis: { type: "string" },
          evidence: {
            type: "array",
            minItems: 1,
            maxItems: 4,
            items: {
              type: "object",
              required: ["metric", "value", "context"],
              properties: {
                metric: {
                  type: "string",
                  description:
                    "Name of the metric or ad id that supports this hypothesis.",
                },
                value: {
                  type: ["number", "string"],
                  description: "Current value of that metric.",
                },
                context: {
                  type: "string",
                  description:
                    "Comparison that makes the value meaningful (e.g. 'baseline 0.22').",
                },
              },
            },
          },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
          },
        },
      },
    },
    actions: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        required: ["priority", "verb", "description", "expected_impact"],
        properties: {
          priority: { type: "string", enum: ["P0", "P1", "P2"] },
          verb: { type: "string" },
          description: { type: "string" },
          expected_impact: { type: "string" },
          affected_ad_ids: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
    client_narrative: {
      type: "object",
      required: ["summary", "wins", "focus_areas", "next_steps"],
      properties: {
        summary: { type: "string" },
        wins: { type: "array", items: { type: "string" } },
        focus_areas: { type: "array", items: { type: "string" } },
        next_steps: { type: "array", items: { type: "string" } },
      },
    },
  },
};

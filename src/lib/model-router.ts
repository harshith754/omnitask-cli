import { GoogleAIProvider } from './providers/google/google-provider.js';
import { DEFAULT_ROUTING, resolveModel } from './providers/google/model-registry.js';
import { getGeminiKey } from '../config.js';
import type { SummarizeOptions } from './ai-provider.js';

/**
 * Supported model preference strings exposed to the CLI user.
 *
 * 'auto'       → smart routing based on content characteristics
 * 'flash-lite' → always use gemini-2.5-flash-lite (fast, high RPD)
 * 'flash'      → always use gemini-2.5-flash (general purpose)
 * 'pro'        → gemini-2.5-pro (complex reasoning — use sparingly, low RPD)
 */
export type ModelPreference = 'auto' | 'flash-lite' | 'flash' | 'pro';

export const VALID_MODEL_PREFERENCES: ModelPreference[] = [
  'auto',
  'flash-lite',
  'flash',
  'pro',
];

/**
 * Content length thresholds for auto-routing.
 *
 * < SHORT_THRESHOLD  → flash-lite (fast, cheap, high RPD)
 * ≥ SHORT_THRESHOLD  → flash     (general purpose)
 */
const SHORT_THRESHOLD = 8_000; // characters

/**
 * Determines the best model alias based on transcript length.
 */
function autoSelectModel(textLength: number): string {
  if (textLength < SHORT_THRESHOLD) return DEFAULT_ROUTING.fast;    // flash-lite
  return DEFAULT_ROUTING.standard;                                   // flash
}

export interface RouteResult {
  summary: string;
  /** The model alias actually used (e.g. 'flash-lite', 'flash') */
  modelUsed: string;
  /** Full model ID sent to the API */
  modelId: string;
}

/**
 * Central routing function for plain-text summarization.
 */
export async function routeSummarize(
  text: string,
  preference: ModelPreference = 'auto',
  opts: Omit<SummarizeOptions, 'model'> = {}
): Promise<RouteResult> {
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error('Gemini API key not found. Run omnitask-cli to configure it.');

  const modelAlias = preference === 'auto' ? autoSelectModel(text.length) : preference;
  const spec = resolveModel(modelAlias);

  const provider = new GoogleAIProvider(apiKey);
  const summary = await provider.summarize(text, { ...opts, model: modelAlias });

  return {
    summary,
    modelUsed: modelAlias,
    modelId: spec.modelId,
  };
}

// ─── HTML Report Routing ──────────────────────────────────────────────────────

import type { ReportData } from './providers/google/report-prompt.js';
import { parseReport } from './providers/google/report-prompt.js';

export interface GenerateReportResult {
  data: ReportData;
  modelUsed: string;
  modelId: string;
  modelName: string;
}

/**
 * Generates a structured ReportData JSON via Gemini and returns it
 * ready for the HTML renderer. Reports always use 'flash' or better
 * since the structured JSON task benefits from higher quality analysis.
 */
export async function routeGenerateReport(
  transcript: string,
  videoUrl: string,
  preference: ModelPreference = 'auto'
): Promise<GenerateReportResult> {
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error('Gemini API key not found. Run omnitask-cli to configure it.');

  // Reports benefit from flash-level quality; flash-lite for short content
  const modelAlias = preference === 'auto'
    ? autoSelectModel(transcript.length)
    : preference;
  const spec = resolveModel(modelAlias);

  const provider = new GoogleAIProvider(apiKey);
  const rawJson = await provider.generateReport(transcript, videoUrl, { model: modelAlias });
  const data = parseReport(rawJson);

  return {
    data,
    modelUsed: modelAlias,
    modelId: spec.modelId,
    modelName: spec.name,
  };
}

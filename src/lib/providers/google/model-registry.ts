/**
 * Gemini Free-Tier Model Registry
 *
 * Central catalog of all supported Gemini models.
 * To add a new model, add an entry here — no other files need to change.
 *
 * Tier overview (Google AI Studio free tier, as of 2026):
 *
 * Model                    | RPM  | RPD   | Best for
 * -------------------------|------|-------|---------------------------------------------
 * gemini-2.5-flash-lite    | 15   | 1,000 | Fast extraction, short summaries, rewrites
 * gemini-2.5-flash         | 10   | 250   | General summarization, CLI routing
 * gemini-2.5-pro           | 5    | 50    | Complex reasoning, deep analysis, code gen
 * gemini-3-flash-preview   | ~    | ~     | Experimental next-gen Flash (unstable)
 */

export interface GeminiModelSpec {
  /** Exact model ID as accepted by the Google AI API */
  modelId: string;
  /** Human-readable display name */
  name: string;
  /** Description of what this model is best at */
  description: string;
  /** Use-case tags for documentation & future smart routing */
  useCases: string[];
  /** Free-tier rate limits */
  limits: {
    rpm: number; // Requests Per Minute
    rpd: number; // Requests Per Day
  };
  /** Capability tier */
  tier: 'lite' | 'standard' | 'pro' | 'preview';
  /** Whether this model is stable and recommended for production use */
  stable: boolean;
}

/**
 * The full model catalog.
 * Keys are short, friendly aliases used everywhere inside the CLI.
 */
export const GEMINI_MODEL_REGISTRY: Readonly<Record<string, GeminiModelSpec>> = {
  'flash-lite': {
    modelId: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    description: 'High-volume categorization, templated rewrites, fast extraction.',
    useCases: ['categorization', 'short-summary', 'extraction', 'rewrite'],
    limits: { rpm: 15, rpd: 1000 },
    tier: 'lite',
    stable: true,
  },
  'flash': {
    modelId: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'General purpose, summarization, and standard CLI routing.',
    useCases: ['summarization', 'general', 'cli-routing', 'analysis'],
    limits: { rpm: 10, rpd: 250 },
    tier: 'standard',
    stable: true,
  },
  'pro': {
    modelId: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Complex logic, deep reasoning, and advanced code generation.',
    useCases: ['reasoning', 'code-generation', 'complex-analysis', 'planning'],
    limits: { rpm: 5, rpd: 50 },
    tier: 'pro',
    stable: true,
  },
  'flash-preview': {
    modelId: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    description: 'Testing next-generation Flash capabilities (experimental).',
    useCases: ['experimental'],
    limits: { rpm: 0, rpd: 0 }, // Restrictive / fluctuating preview limits
    tier: 'preview',
    stable: false,
  },
} as const;

/** Default model aliases for automatic routing */
export const DEFAULT_ROUTING: Readonly<Record<string, string>> = {
  /** Short / fast tasks — high RPD allowance */
  fast: 'flash-lite',
  /** Standard tasks — balanced quality/speed */
  standard: 'flash',
  /** Complex reasoning tasks (future) */
  reasoning: 'pro',
} as const;

/** Returns all stable models suitable for production use */
export function getStableModels(): GeminiModelSpec[] {
  return Object.values(GEMINI_MODEL_REGISTRY).filter((m) => m.stable);
}

/** Resolves a model alias to its full spec, throws on unknown keys */
export function resolveModel(alias: string): GeminiModelSpec {
  const spec = GEMINI_MODEL_REGISTRY[alias];
  if (!spec) {
    const valid = Object.keys(GEMINI_MODEL_REGISTRY).join(', ');
    throw new Error(`Unknown model alias: "${alias}". Valid options: ${valid}`);
  }
  return spec;
}

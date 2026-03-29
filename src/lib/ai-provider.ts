/**
 * Abstract interface for all AI provider implementations.
 *
 * Adding a new provider (e.g. OpenAI, Anthropic) in the future:
 *   1. Create src/lib/providers/<name>/<name>-provider.ts
 *   2. Implement AIProvider
 *   3. Register it in model-router.ts
 */

export interface SummarizeOptions {
  /** Model key (e.g. 'flash', 'flash-lite', 'pro') */
  model?: string;
  /** Optional system prompt override */
  systemPrompt?: string;
}

export interface AIProvider {
  summarize(text: string, opts?: SummarizeOptions): Promise<string>;
}

/**
 * @deprecated Use model-router.ts or providers/google/google-provider.ts directly.
 *
 * This file is kept as a thin shim so any external tooling that still imports
 * 'gemini-client' doesn't break immediately.
 */
export { GoogleAIProvider as GeminiClient } from './providers/google/google-provider.js';

import { Stagehand } from '@browserbasehq/stagehand';
import {
  getBrowserbaseKey,
  getBrowserbaseProjectId,
  getGeminiKey,
} from '../config.js';

/**
 * Build a Stagehand instance configured to run on Browserbase with Gemini as
 * the underlying LLM. Caller is responsible for `init()` and `close()`.
 */
export function createStagehand(): Stagehand {
  const apiKey = getBrowserbaseKey();
  const projectId = getBrowserbaseProjectId();
  const geminiKey = getGeminiKey();

  if (!apiKey || !projectId) {
    throw new Error('Browserbase credentials missing. Run onboarding first.');
  }
  if (!geminiKey) {
    throw new Error('Gemini API key missing. Run onboarding first.');
  }

  return new Stagehand({
    env: 'BROWSERBASE',
    apiKey,
    projectId,
    verbose: 0,
    experimental: true,
    model: {
      modelName: 'google/gemini-2.5-flash',
      apiKey: geminiKey,
    },
  });
}

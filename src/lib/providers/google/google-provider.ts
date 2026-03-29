import { GoogleGenAI } from '@google/genai';
import type { AIProvider, SummarizeOptions } from '../../ai-provider.js';
import { resolveModel } from './model-registry.js';

const DEFAULT_SUMMARIZE_PROMPT = `You are a helpful assistant that summarizes YouTube video transcripts into clear, well-structured key bullet points in Markdown format. Be concise and informative. Use headers where appropriate.`;

/**
 * Google AI Studio provider implementation.
 *
 * This class is intentionally decoupled from the global config — it accepts
 * the API key via constructor so it can be swapped for any key source
 * (e.g. env var, Vertex AI service account, user config, etc.).
 *
 * Plug-and-play: pass a different apiKey to point at a different project/quota.
 */
export class GoogleAIProvider implements AIProvider {
  private readonly ai: GoogleGenAI;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('A Gemini API key is required to initialize GoogleAIProvider.');
    this.ai = new GoogleGenAI({ apiKey });
  }

  async summarize(text: string, opts: SummarizeOptions = {}): Promise<string> {
    const modelAlias = opts.model ?? 'flash';
    const spec = resolveModel(modelAlias);

    const systemPrompt = opts.systemPrompt ?? DEFAULT_SUMMARIZE_PROMPT;

    const response = await this.ai.models.generateContent({
      model: spec.modelId,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${systemPrompt}\n\nTranscript to summarize:\n\n${text}`,
            },
          ],
        },
      ],
    });

    return response.text ?? 'No response generated.';
  }

  /**
   * Generates a structured JSON report for the HTML viewer.
   * Uses the report-prompt system prompt that instructs Gemini to return
   * a ReportData JSON object with flexible section types.
   */
  async generateReport(transcript: string, videoUrl: string, opts: SummarizeOptions = {}): Promise<string> {
    const modelAlias = opts.model ?? 'flash';
    const spec = resolveModel(modelAlias);

    const { REPORT_SYSTEM_PROMPT } = await import('./report-prompt.js');

    const response = await this.ai.models.generateContent({
      model: spec.modelId,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${REPORT_SYSTEM_PROMPT}\n\nVideo URL: ${videoUrl}\n\nTranscript:\n${transcript}`,
            },
          ],
        },
      ],
    });

    return response.text ?? '{}';
  }
}

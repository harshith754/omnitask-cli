/**
 * Structured report types and the Gemini prompt that produces them.
 *
 * Gemini is asked to return ONLY valid JSON matching ReportData.
 * The section array is flexible — Gemini decides which section types
 * are appropriate for the specific video content.
 */

// ─── Section Types ────────────────────────────────────────────────────────────

export type SectionType =
  | 'key-insights'  // Bullet point list of main takeaways
  | 'topics'        // Deep-dive topic cards with importance badges
  | 'timeline'      // Chronological events (tutorials, news, history)
  | 'table'         // Structured tabular data (steps, specs, comparisons)
  | 'pie-chart'     // Distribution / proportional data (finance, demographics)
  | 'bar-chart'     // Comparative values (rankings, metrics, scores)
  | 'comparison'    // Two-side comparison (pros/cons, A vs B)
  | 'quotes'        // Notable verbatim quotes
  | 'stats';        // Key numbers / statistics callout cards

export interface Section {
  type: SectionType;
  title: string;
  data: Record<string, unknown>;
}

// ─── Typed Section Data Shapes ────────────────────────────────────────────────

export interface KeyInsightsData { items: string[] }
export interface TopicsData { items: Array<{ name: string; summary: string; importance: 'high' | 'medium' | 'low' }> }
export interface TimelineData { events: Array<{ time: string; event: string }> }
export interface TableData { headers: string[]; rows: string[][] }
export interface PieChartData { labels: string[]; values: number[] }
export interface BarChartData { labels: string[]; values: number[]; unit?: string }
export interface ComparisonData { sides: [{ label: string; items: string[] }, { label: string; items: string[] }] }
export interface QuotesData { items: string[] }
export interface StatsData { items: Array<{ label: string; value: string; note?: string }> }

// ─── Top-Level Report ─────────────────────────────────────────────────────────

export interface ReportData {
  title: string;
  tldr: string;
  sentiment: string;
  tags: string[];
  sections: Section[];
}

// ─── System Prompt ────────────────────────────────────────────────────────────

export const REPORT_SYSTEM_PROMPT = `You are an expert content analyst. Analyze the following video transcript and return a structured JSON report.

CRITICAL: Return ONLY raw valid JSON. No markdown code blocks. No prose before or after. No \`\`\`json. Just the JSON object.

Choose the most appropriate section types for THIS specific content (4–6 sections max, ordered by importance):

Available section types:
- "key-insights": Core takeaways. data: { "items": ["string", ...] }
- "topics": Topic deep-dives. data: { "items": [{ "name": "str", "summary": "str", "importance": "high"|"medium"|"low" }] }
- "timeline": Chronological events. data: { "events": [{ "time": "str", "event": "str" }] }
- "table": Structured data. data: { "headers": ["str"], "rows": [["str", ...]] }
- "pie-chart": Distribution data (ONLY if actual proportional/percentage data exists). data: { "labels": ["str"], "values": [number] }
- "bar-chart": Comparative values (ONLY if actual numeric comparisons exist). data: { "labels": ["str"], "values": [number], "unit": "optional str" }
- "comparison": Two sides. data: { "sides": [{ "label": "str", "items": ["str"] }, { "label": "str", "items": ["str"] }] }
- "quotes": Notable quotes. data: { "items": ["str"] }
- "stats": Key stats. data: { "items": [{ "label": "str", "value": "str", "note": "optional str" }] }

Return this exact JSON shape:
{
  "title": "concise inferred video title",
  "tldr": "1-2 sentence summary",
  "sentiment": "one word: educational|motivational|analytical|entertaining|informational|mixed",
  "tags": ["tag1", "tag2", "tag3"],
  "sections": [
    { "type": "key-insights", "title": "Key Takeaways", "data": { "items": ["..."] } }
  ]
}

RULES:
1. Only include charts if real numeric data exists in the transcript
2. Timeline only for content with actual sequence of events
3. Table only when there is genuinely tabular data (steps, specs, comparisons)
4. All strings must be clean — no markdown syntax inside JSON strings
5. Bar/pie chart values must be real numbers, not made up
`;

// ─── JSON Parser ──────────────────────────────────────────────────────────────

function createFallbackReport(raw: string): ReportData {
  return {
    title: 'Video Summary',
    tldr: 'Summary generated from video transcript.',
    sentiment: 'informational',
    tags: [],
    sections: [
      {
        type: 'key-insights',
        title: 'Summary',
        data: { items: [raw.slice(0, 500)] },
      },
    ],
  };
}

/**
 * Safely parses Gemini's JSON response into ReportData.
 * Strips markdown fences if Gemini added them despite instructions.
 */
export function parseReport(raw: string): ReportData {
  let cleaned = raw.trim();

  // Strip markdown code blocks if Gemini wrapped it
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();

  // Find the first { and last } in case there's stray text
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return createFallbackReport(cleaned);

  cleaned = cleaned.slice(start, end + 1);

  try {
    const parsed = JSON.parse(cleaned) as ReportData;
    // Basic validation
    if (!parsed.title || !parsed.sections || !Array.isArray(parsed.sections)) {
      return createFallbackReport(raw);
    }
    return parsed;
  } catch {
    return createFallbackReport(raw);
  }
}

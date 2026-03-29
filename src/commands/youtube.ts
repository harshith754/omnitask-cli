// @ts-ignore - Direct ESM import to bypass package configuration issues in Node.js
import { fetchTranscript } from 'youtube-transcript/dist/youtube-transcript.esm.js';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { routeGenerateReport, type ModelPreference } from '../lib/model-router.js';
import { openHTMLReport } from '../ui/html-report.js';

export interface YoutubeCommandOptions {
  model?: ModelPreference;
}

/**
 * Logic for the 'yt <url>' command.
 *
 * Flow:
 *  1. Extract transcript
 *  2. Route to Gemini and generate structured JSON report
 *  3. Render to a self-contained HTML file
 *  4. Open in the user's default browser
 */
export async function youtubeCommand(
  url: string,
  opts: YoutubeCommandOptions = {}
): Promise<void> {
  const model = opts.model ?? 'auto';
  const s = p.spinner();

  s.start(chalk.cyan('🔍 Extracting transcript from YouTube...'));

  try {
    // Step 1: Fetch transcript
    const transcriptData = await fetchTranscript(url);
    const fullTranscript = (transcriptData as Array<{ text: string }>)
      .map((t) => t.text)
      .join(' ');
    const length = fullTranscript.length;

    s.message(chalk.blue(`📝 Transcript extracted — ${length.toLocaleString()} characters`));

    // Step 2: Generate structured report via Gemini
    s.message(chalk.magenta('🧠 Analyzing content and building report...'));
    const { data, modelName, modelId } = await routeGenerateReport(fullTranscript, url, model);

    // Step 3 & 4: Render HTML and open in browser
    s.message(chalk.cyan('🌐 Opening report in browser...'));
    const filePath = await openHTMLReport(data, fullTranscript, url, modelName, modelId);

    s.stop(chalk.green(`✨ Report ready! Opened in your browser.`));
    p.log.info(chalk.dim(`   File: ${filePath}`));

  } catch (error: any) {
    s.stop(chalk.red('❌ Failed to process YouTube video.'));

    const msg: string = error?.message ?? String(error);
    if (msg.includes('Transcript is disabled') || msg.includes('subtitles')) {
      p.log.error('Transcript is disabled or unavailable for this video.');
    } else if (msg.includes('Impossible to retrieve') || msg.includes('Invalid video')) {
      p.log.error('Invalid YouTube URL or Video ID.');
    } else {
      p.log.error(msg);
    }

    process.exit(1);
  }
}

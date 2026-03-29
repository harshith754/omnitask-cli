#!/usr/bin/env node
import { Command } from 'commander';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { ensureConfig, ensureApplyConfig } from './onboarding.js';
import { youtubeCommand } from './commands/youtube.js';
import { applyCommand } from './commands/apply.js';
import { profileCommand } from './commands/profile.js';
import { printBanner } from './ui/banner.js';
import { createRequire } from 'module';
import { VALID_MODEL_PREFERENCES, type ModelPreference } from './lib/model-router.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

const TASKS = [
  { value: 'yt', label: '📹  Summarize a YouTube Video', hint: 'Extract and summarize transcript using AI' },
  { value: 'apply', label: '💼  Apply to a Job', hint: 'Auto-fill a job application form from your profile' },
  { value: 'profile', label: '📝  Edit Job Profile', hint: 'View or update your saved application data' },
  { value: '_coming', label: chalk.dim('💬  Chat (coming soon)'), hint: 'Interactive AI chat session' },
];

const VALID_MODELS = VALID_MODEL_PREFERENCES;

/**
 * Interactive default mode: show banner + task selector.
 */
async function interactiveMode(): Promise<void> {
  printBanner(pkg.version, 'gemini-2.5-flash');
  await ensureConfig();

  const task = await p.select({
    message: chalk.white('What would you like to do?'),
    options: TASKS.map((t) => ({
      value: t.value,
      label: t.label,
      hint: t.hint,
    })),
  });

  if (p.isCancel(task)) {
    p.cancel(chalk.dim('Cancelled. See you next time!'));
    process.exit(0);
  }

  if (task === '_coming') {
    p.log.warn(chalk.yellow('This task is coming soon. Stay tuned!'));
    process.exit(0);
  }

  // Execute the selected task
  if (task === 'yt') {
    const url = await p.text({
      message: 'Enter the YouTube video URL:',
      placeholder: 'https://www.youtube.com/watch?v=...',
      validate: (v) => {
        if (!v) return 'A URL is required';
        if (!v.includes('youtube.com') && !v.includes('youtu.be')) return 'Must be a valid YouTube URL';
      },
    });

    if (p.isCancel(url)) {
      p.cancel(chalk.dim('Cancelled.'));
      process.exit(0);
    }

    await youtubeCommand(url as string, { model: 'auto' });
  }

  if (task === 'apply') {
    await ensureApplyConfig();
    const url = await p.text({
      message: 'Enter the job posting / application URL:',
      placeholder: 'https://jobs.lever.co/...',
      validate: (v) => {
        if (!v) return 'A URL is required';
        if (!v.startsWith('http')) return 'Must be a valid URL';
      },
    });
    if (p.isCancel(url)) { p.cancel(chalk.dim('Cancelled.')); process.exit(0); }

    const submit = await p.confirm({
      message: 'Actually submit the application at the end?',
      initialValue: false,
    });
    if (p.isCancel(submit)) { p.cancel(chalk.dim('Cancelled.')); process.exit(0); }

    await applyCommand(url as string, { submit: submit as boolean });
  }

  if (task === 'profile') {
    await profileCommand();
  }
}

/**
 * Main CLI entry point.
 */
const program = new Command();

program
  .name('omnitask-cli')
  .description('AI-powered tasks for your terminal.')
  .version(pkg.version)
  .option('--model <model>', `AI model alias: ${VALID_MODELS.join(', ')}`, 'auto')
  .option('--task <task>', 'Task to run directly without interactive mode (e.g. yt)');

// Pre-action hook: ensure API keys before any command runs
program.hook('preAction', async () => {
  try {
    await ensureConfig();
  } catch (error: any) {
    p.log.error(chalk.red(`⚠️  Configuration error: ${error.message}`));
    process.exit(1);
  }
});

// COMMAND: apply <url>
program
  .command('apply')
  .description('Auto-fill a job application form from your saved profile.')
  .argument('<url>', 'Job posting / application URL')
  .option('--submit', 'Actually click the final submit button', false)
  .option('--dry-run', 'Only scan and print form fields; do not fill', false)
  .option('--field <kv...>', 'Per-run field override(s), e.g. --field coverLetter="..."')
  .action(async (url: string, cmdOpts: { submit?: boolean; dryRun?: boolean; field?: string[] }) => {
    await ensureApplyConfig();
    await applyCommand(url, {
      submit: cmdOpts.submit,
      dryRun: cmdOpts.dryRun,
      fields: cmdOpts.field,
    });
  });

// COMMAND: profile
program
  .command('profile')
  .description('View or edit your saved job-application profile.')
  .action(async () => {
    await profileCommand();
  });

// COMMAND: yt <url>
program
  .command('yt')
  .description('Summarize a YouTube video transcript using AI.')
  .argument('<url>', 'YouTube URL (e.g. https://www.youtube.com/watch?v=...)')
  .option('--model <model>', `Override AI model: ${VALID_MODELS.join(', ')}`)
  .action(async (url: string, cmdOpts: { model?: string }) => {
    const globalOpts = program.opts();
    const model = (cmdOpts.model ?? globalOpts.model ?? 'auto') as ModelPreference;

    if (!VALID_MODELS.includes(model)) {
      p.log.error(`Invalid model "${model}". Valid options: ${VALID_MODELS.join(', ')}`);
      process.exit(1);
    }

    await youtubeCommand(url, { model });
  });

// Unknown command handler
program.on('command:*', () => {
  p.log.error(chalk.red(`🚫 Unknown command. Run ${chalk.bold('omnitask-cli --help')} for usage.`));
  process.exit(1);
});

const args = process.argv.slice(2);

// If --task flag was passed without a subcommand, route to it
const taskIndex = args.indexOf('--task');
if (taskIndex !== -1 && args[taskIndex + 1]) {
  const taskName = args[taskIndex + 1];
  const urlArg = args.filter((a) => !a.startsWith('--') && a !== taskName)[0];

  if (taskName === 'yt') {
    (async () => {
      await ensureConfig();
      const globalOpts = program.opts();

      // If no URL provided inline, prompt for it
      let url = urlArg;
      if (!url) {
        const result = await p.text({
          message: 'Enter the YouTube video URL:',
          placeholder: 'https://www.youtube.com/watch?v=...',
          validate: (v) => {
            if (!v) return 'A URL is required';
            if (!v.includes('youtube.com') && !v.includes('youtu.be')) return 'Must be a valid YouTube URL';
          },
        });
        if (p.isCancel(result)) { p.cancel('Cancelled.'); process.exit(0); }
        url = result as string;
      }

      const modelArg = args.indexOf('--model');
      const model = (modelArg !== -1 ? args[modelArg + 1] : globalOpts.model ?? 'auto') as ModelPreference;
      await youtubeCommand(url, { model });
    })();
  } else {
    console.error(`Unknown task: ${taskName}`);
    process.exit(1);
  }
  // Stop commander from parsing this
} else if (args.length === 0 || (args.length === 1 && (args[0] === '--model' || args[0] === '--task'))) {
  // No args - launch interactive mode
  interactiveMode().catch((err) => {
    console.error(chalk.red('Fatal error:'), err);
    process.exit(1);
  });
} else {
  // Normal commander routing
  program.parseAsync(process.argv).catch((err) => {
    console.error(chalk.red('Fatal error:'), err);
    process.exit(1);
  });
}

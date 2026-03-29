import * as p from '@clack/prompts';
import {
  getGeminiKey,
  setApiKey,
  hasBrowserbaseCreds,
  setBrowserbaseCreds,
  hasJobProfile,
} from './config.js';
import { runJobProfileWizard } from './lib/job-profile.js';
import chalk from 'chalk';

/**
 * Checks if the required API keys are present.
 * If any are missing, intercepts with an interactive onboarding flow.
 */
export async function ensureConfig(): Promise<void> {
  const geminiKey = getGeminiKey();

  if (geminiKey) {
    return;
  }

  p.intro(chalk.bgCyan(chalk.black(' 🚀 Welcome to omnitask-cli Onboarding ')));

  const key = await p.password({
    message: 'Enter your Gemini API Key:',
    validate: (value?: string) => {
      if (!value) return 'Gemini API Key is required';
      return;
    },
  });

  if (p.isCancel(key)) {
    p.cancel('Setup cancelled. A Gemini API Key is required.');
    process.exit(0);
  }

  setApiKey('gemini', key as string);
  p.outro(chalk.green('✅ API Key configured! Auto-resuming your command...'));
}

/**
 * Ensures Browserbase credentials and a job profile are configured.
 * Gated to the `apply` command.
 */
export async function ensureApplyConfig(): Promise<void> {
  if (!hasBrowserbaseCreds()) {
    p.intro(chalk.bgCyan(chalk.black(' 🌐 Browserbase Setup ')));
    p.log.info(chalk.dim('Get your API key from https://www.browserbase.com/settings'));

    const apiKey = await p.password({
      message: 'Enter your Browserbase API Key:',
      validate: (v?: string) => (v ? undefined : 'Browserbase API Key is required'),
    });
    if (p.isCancel(apiKey)) {
      p.cancel('Setup cancelled.');
      process.exit(0);
    }

    const projectId = await p.text({
      message: 'Enter your Browserbase Project ID:',
      placeholder: 'e.g. 9487df9b-db21-4772-a7ec-b4f31c5bdf8e',
      validate: (v?: string) => (v ? undefined : 'Project ID is required'),
    });
    if (p.isCancel(projectId)) {
      p.cancel('Setup cancelled.');
      process.exit(0);
    }

    setBrowserbaseCreds(apiKey as string, projectId as string);
    p.outro(chalk.green('✅ Browserbase configured.'));
  }

  if (!hasJobProfile()) {
    await runJobProfileWizard();
  }
}

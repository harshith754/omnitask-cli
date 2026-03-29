import * as p from '@clack/prompts';
import chalk from 'chalk';
import { getJobProfile, getResumePath } from '../config.js';
import { formatProfileSummary, runJobProfileWizard } from '../lib/job-profile.js';

export async function profileCommand(): Promise<void> {
  const existing = getJobProfile();
  const resume = getResumePath();

  if (existing) {
    p.intro(chalk.bgMagenta(chalk.black(' 📋 Saved Job Profile ')));
    console.log(formatProfileSummary(existing, resume));
    const edit = await p.confirm({
      message: 'Edit this profile?',
      initialValue: false,
    });
    if (p.isCancel(edit) || !edit) {
      p.outro(chalk.dim('No changes.'));
      return;
    }
  }

  await runJobProfileWizard();
}

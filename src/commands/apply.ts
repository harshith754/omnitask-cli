import * as p from '@clack/prompts';
import chalk from 'chalk';
import fs from 'fs';
import { createStagehand } from '../lib/stagehand-client.js';
import { getJobProfile, getResumePath, type JobProfile } from '../config.js';

interface ApplyOptions {
  submit?: boolean;
  dryRun?: boolean;
  fields?: string[]; // ["key=value", ...]
}

/** Turn the saved profile into Stagehand `variables` with descriptions. */
function buildVariables(profile: JobProfile, overrides: Record<string, string>) {
  const entries: Record<string, { value: string; description: string }> = {};
  const add = (k: string, v: string | undefined, description: string) => {
    const finalVal = overrides[k] ?? v;
    if (finalVal) entries[k] = { value: finalVal, description };
  };

  add('firstName', profile.firstName, 'Applicant first name / given name');
  add('lastName', profile.lastName, 'Applicant last name / family name / surname');
  add('fullName', profile.firstName && profile.lastName ? `${profile.firstName} ${profile.lastName}` : undefined, 'Applicant full name');
  add('email', profile.email, 'Applicant email address');
  add('phone', profile.phone, 'Applicant phone number');
  add('addressLine1', profile.addressLine1, 'Street address');
  add('city', profile.city, 'City');
  add('state', profile.state, 'State, province, or region');
  add('postalCode', profile.postalCode, 'Postal / ZIP code');
  add('country', profile.country, 'Country');
  add('linkedin', profile.linkedin, 'LinkedIn profile URL');
  add('github', profile.github, 'GitHub profile URL');
  add('portfolio', profile.portfolio, 'Personal website / portfolio URL');
  add('currentCompany', profile.currentCompany, 'Current employer / company');
  add('currentTitle', profile.currentTitle, 'Current job title');
  add('yearsExperience', profile.yearsExperience, 'Total years of professional experience');
  add('workAuthorization', profile.workAuthorization, 'Work authorization / visa status');
  add('requiresSponsorship', profile.requiresSponsorship, 'Whether applicant requires visa sponsorship (yes/no)');
  add('willingToRelocate', profile.willingToRelocate, 'Whether applicant is willing to relocate (yes/no)');
  add('gender', profile.gender, 'Gender (voluntary EEO)');
  add('race', profile.race, 'Race / Ethnicity (voluntary EEO)');
  add('veteranStatus', profile.veteranStatus, 'Veteran status (voluntary)');
  add('disabilityStatus', profile.disabilityStatus, 'Disability status (voluntary)');
  add('salaryExpectation', profile.salaryExpectation, 'Expected salary / compensation');
  add('earliestStartDate', profile.earliestStartDate, 'Earliest available start date');
  add('coverLetter', profile.coverLetter, 'Cover letter text');

  return entries;
}

function parseFieldOverrides(fields?: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fields) return out;
  for (const raw of fields) {
    const eq = raw.indexOf('=');
    if (eq === -1) continue;
    out[raw.slice(0, eq).trim()] = raw.slice(eq + 1);
  }
  return out;
}

export async function applyCommand(url: string, opts: ApplyOptions): Promise<void> {
  const profile = getJobProfile();
  if (!profile) {
    p.log.error(chalk.red('No job profile found. Run `omnitask-cli profile` first.'));
    process.exit(1);
  }

  const resumePath = getResumePath();
  if (resumePath && !fs.existsSync(resumePath)) {
    p.log.warn(chalk.yellow(`Resume not found at ${resumePath} — file upload steps will fail.`));
  }

  const overrides = parseFieldOverrides(opts.fields);
  const variables = buildVariables(profile, overrides);

  const s = p.spinner();
  s.start('Launching Browserbase session…');

  const stagehand = createStagehand();
  try {
    await stagehand.init();
    s.stop(chalk.green('✓ Browserbase session ready'));

    const sessionId = stagehand.browserbaseSessionID;
    const replayUrl = sessionId ? `https://browserbase.com/sessions/${sessionId}` : undefined;
    if (replayUrl) {
      p.log.info(`${chalk.bold('Session replay:')} ${chalk.cyan(replayUrl)}`);
    }

    s.start(`Navigating to ${url}`);
    const page = stagehand.context.activePage();
    if (!page) throw new Error('No active browser page available.');
    await page.goto(url);
    s.stop(chalk.green('✓ Page loaded'));

    if (opts.dryRun) {
      s.start('Scanning form fields (dry run)…');
      const fields = await stagehand.observe(
        'list every form input, textarea, select, radio, checkbox, and file upload on the page along with its visible label',
      );
      s.stop(chalk.green(`✓ Found ${fields.length} field(s)`));
      for (const f of fields) {
        console.log(`  • ${chalk.dim(JSON.stringify(f))}`);
      }
      p.log.info(chalk.dim('Dry run complete — no fields filled.'));
      return;
    }

    const instruction = [
      'You are filling out a job application form for the applicant.',
      'Click the "Apply" or "Apply now" button if one is present to reach the application form.',
      'Fill every visible form field using the provided variables — match fields semantically to the most appropriate variable (e.g. "Given name" → %firstName%, "Family name" → %lastName%, "Work email" → %email%).',
      'For dropdowns, radios, and checkboxes, pick the option that best matches the variable value.',
      resumePath ? `If there is a resume / CV file upload, upload the file at this local path: ${resumePath}` : 'Skip any file-upload fields.',
      'For multi-step forms (like Workday), click Next / Continue and repeat until you reach the review / submit screen.',
      opts.submit
        ? 'After reaching the final review screen, click the Submit button to submit the application.'
        : 'STOP when you reach the review / submit screen. DO NOT click the final Submit button.',
      'Leave EEO / voluntary self-identification fields blank if the provided variable is empty — do not guess.',
      'If a required field has no matching variable, leave it blank and continue.',
    ].join('\n');

    s.start('Agent is filling the application…');
    const agent = stagehand.agent({ experimental: true } as any);
    const result = await agent.execute({
      instruction,
      variables,
      maxSteps: 40,
    } as any);
    s.stop(chalk.green('✓ Agent finished'));

    p.log.info(chalk.bold('Result:'));
    console.log(chalk.dim(typeof result === 'string' ? result : JSON.stringify(result, null, 2)));

    if (replayUrl) {
      p.note(
        `${chalk.bold('Review the run:')}\n${chalk.cyan(replayUrl)}\n\n` +
          (opts.submit
            ? chalk.yellow('⚠️  --submit was passed — the application may have been submitted.')
            : chalk.green('✓ Stopped on review screen. Re-run with --submit to actually submit.')),
        'Done',
      );
    }
  } catch (err: any) {
    s.stop(chalk.red('✗ Failed'));
    p.log.error(chalk.red(err?.message ?? String(err)));
    process.exitCode = 1;
  } finally {
    try {
      await stagehand.close();
    } catch {
      /* ignore */
    }
  }
}

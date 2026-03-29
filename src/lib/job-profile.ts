import * as p from '@clack/prompts';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  getJobProfile,
  setJobProfile,
  getResumePath,
  setResumePath,
  type JobProfile,
} from '../config.js';

/**
 * Interactive wizard to collect the user's job-application profile.
 * Pre-fills with existing saved values so editing is additive.
 */
export async function runJobProfileWizard(): Promise<JobProfile> {
  const existing = getJobProfile() ?? {};

  p.intro(chalk.bgMagenta(chalk.black(' 📝 Job Application Profile ')));
  p.log.info(chalk.dim('Fill this once; the filler reuses it on every job form.'));

  const ask = async (
    key: keyof JobProfile,
    message: string,
    opts: { required?: boolean; placeholder?: string } = {},
  ): Promise<string | undefined> => {
    const initial = (existing[key] as string | undefined) ?? '';
    const result = await p.text({
      message,
      placeholder: opts.placeholder,
      initialValue: initial,
      validate: (v) => {
        if (opts.required && !v) return `${message} is required`;
        return undefined;
      },
    });
    if (p.isCancel(result)) {
      p.cancel('Profile setup cancelled.');
      process.exit(0);
    }
    const str = (result as string).trim();
    return str || undefined;
  };

  const profile: JobProfile = {};

  profile.firstName = await ask('firstName', 'First name', { required: true });
  profile.lastName = await ask('lastName', 'Last name', { required: true });
  profile.email = await ask('email', 'Email', { required: true, placeholder: 'you@example.com' });
  profile.phone = await ask('phone', 'Phone', { placeholder: '+1 555 123 4567' });
  profile.addressLine1 = await ask('addressLine1', 'Street address');
  profile.city = await ask('city', 'City');
  profile.state = await ask('state', 'State / Region');
  profile.postalCode = await ask('postalCode', 'Postal code');
  profile.country = await ask('country', 'Country');
  profile.linkedin = await ask('linkedin', 'LinkedIn URL', { placeholder: 'https://linkedin.com/in/...' });
  profile.github = await ask('github', 'GitHub URL', { placeholder: 'https://github.com/...' });
  profile.portfolio = await ask('portfolio', 'Portfolio / Website');
  profile.currentCompany = await ask('currentCompany', 'Current company');
  profile.currentTitle = await ask('currentTitle', 'Current title');
  profile.yearsExperience = await ask('yearsExperience', 'Years of experience');
  profile.workAuthorization = await ask('workAuthorization', 'Work authorization (e.g. "US Citizen", "H1B")');
  profile.requiresSponsorship = await ask('requiresSponsorship', 'Requires sponsorship? (yes/no)');
  profile.willingToRelocate = await ask('willingToRelocate', 'Willing to relocate? (yes/no)');
  profile.salaryExpectation = await ask('salaryExpectation', 'Salary expectation');
  profile.earliestStartDate = await ask('earliestStartDate', 'Earliest start date');
  profile.gender = await ask('gender', 'Gender (voluntary, for EEO)');
  profile.race = await ask('race', 'Race / Ethnicity (voluntary, for EEO)');
  profile.veteranStatus = await ask('veteranStatus', 'Veteran status (voluntary)');
  profile.disabilityStatus = await ask('disabilityStatus', 'Disability status (voluntary)');
  profile.coverLetter = await ask('coverLetter', 'Default cover letter (optional, can be overridden per-run)');

  // Resume path
  const currentResume = getResumePath() ?? '';
  const resumeInput = await p.text({
    message: 'Path to your resume PDF',
    placeholder: '~/Documents/resume.pdf',
    initialValue: currentResume,
  });
  if (p.isCancel(resumeInput)) {
    p.cancel('Profile setup cancelled.');
    process.exit(0);
  }
  const resumeStr = (resumeInput as string).trim();
  if (resumeStr) {
    const expanded = resumeStr.startsWith('~')
      ? path.join(os.homedir(), resumeStr.slice(1))
      : path.resolve(resumeStr);
    if (!fs.existsSync(expanded)) {
      p.log.warn(chalk.yellow(`Resume file not found at ${expanded} — saving anyway.`));
    }
    setResumePath(expanded);
  }

  setJobProfile(profile);
  p.outro(chalk.green('✅ Job profile saved.'));
  return profile;
}

/** Pretty, masked summary of the saved profile (for `profile` command). */
export function formatProfileSummary(profile: JobProfile, resumePath?: string): string {
  const mask = (s?: string) => {
    if (!s) return chalk.dim('—');
    if (s.length <= 4) return s;
    return s.slice(0, 2) + '***' + s.slice(-2);
  };
  const show = (s?: string) => s || chalk.dim('—');

  const lines = [
    `${chalk.bold('Name:')}         ${show(profile.firstName)} ${show(profile.lastName)}`,
    `${chalk.bold('Email:')}        ${mask(profile.email)}`,
    `${chalk.bold('Phone:')}        ${mask(profile.phone)}`,
    `${chalk.bold('Location:')}     ${show(profile.city)}, ${show(profile.state)} ${show(profile.country)}`,
    `${chalk.bold('LinkedIn:')}     ${show(profile.linkedin)}`,
    `${chalk.bold('GitHub:')}       ${show(profile.github)}`,
    `${chalk.bold('Current:')}      ${show(profile.currentTitle)} @ ${show(profile.currentCompany)}`,
    `${chalk.bold('Experience:')}   ${show(profile.yearsExperience)} years`,
    `${chalk.bold('Work auth:')}    ${show(profile.workAuthorization)}`,
    `${chalk.bold('Sponsorship:')}  ${show(profile.requiresSponsorship)}`,
    `${chalk.bold('Relocate:')}     ${show(profile.willingToRelocate)}`,
    `${chalk.bold('Salary:')}       ${show(profile.salaryExpectation)}`,
    `${chalk.bold('Start date:')}   ${show(profile.earliestStartDate)}`,
    `${chalk.bold('Resume:')}       ${show(resumePath)}`,
  ];
  return lines.join('\n');
}

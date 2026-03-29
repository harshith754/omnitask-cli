import Conf from 'conf';
import path from 'path';
import os from 'os';

export interface JobProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  currentCompany?: string;
  currentTitle?: string;
  yearsExperience?: string;
  workAuthorization?: string;
  requiresSponsorship?: string;
  willingToRelocate?: string;
  gender?: string;
  race?: string;
  veteranStatus?: string;
  disabilityStatus?: string;
  salaryExpectation?: string;
  earliestStartDate?: string;
  coverLetter?: string;
}

export interface Config {
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  BROWSERBASE_API_KEY?: string;
  BROWSERBASE_PROJECT_ID?: string;
  JOB_PROFILE?: JobProfile;
  RESUME_PATH?: string;
}

const config = new Conf<Config>({
  projectName: 'omnitask-cli',
  cwd: path.join(os.homedir(), '.config', 'omnitask-cli'),
  configName: 'config',
});

export function getOpenAIKey(): string | undefined {
  return config.get('OPENAI_API_KEY');
}

export function getGeminiKey(): string | undefined {
  return config.get('GEMINI_API_KEY');
}

export function setApiKey(provider: 'openai' | 'gemini', key: string): void {
  const field = provider === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY';
  config.set(field, key);
}

export function getBrowserbaseKey(): string | undefined {
  return config.get('BROWSERBASE_API_KEY');
}

export function getBrowserbaseProjectId(): string | undefined {
  return config.get('BROWSERBASE_PROJECT_ID');
}

export function setBrowserbaseCreds(apiKey: string, projectId: string): void {
  config.set('BROWSERBASE_API_KEY', apiKey);
  config.set('BROWSERBASE_PROJECT_ID', projectId);
}

export function getJobProfile(): JobProfile | undefined {
  return config.get('JOB_PROFILE');
}

export function setJobProfile(profile: JobProfile): void {
  config.set('JOB_PROFILE', profile);
}

export function getResumePath(): string | undefined {
  return config.get('RESUME_PATH');
}

export function setResumePath(p: string): void {
  config.set('RESUME_PATH', p);
}

export function hasRequiredKeys(): boolean {
  return !!getGeminiKey();
}

export function hasBrowserbaseCreds(): boolean {
  return !!getBrowserbaseKey() && !!getBrowserbaseProjectId();
}

export function hasJobProfile(): boolean {
  const profile = getJobProfile();
  return !!profile && !!profile.firstName && !!profile.email;
}

export default config;

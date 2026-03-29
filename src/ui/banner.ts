import figlet from 'figlet';
import gradient from 'gradient-string';
import chalk from 'chalk';

const OMNI_GRADIENT = gradient(['#00f0ff', '#a855f7', '#ec4899']);
const DIM = chalk.dim;

/**
 * Prints the rich banner header to the terminal, inspired by Gemini CLI.
 */
export function printBanner(version: string, model = 'gemini-2.5-flash'): void {
  const banner = figlet.textSync('OmniTask', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
  });

  console.log('\n' + OMNI_GRADIENT.multiline(banner));

  const modelBadge = chalk.bgHex('#a855f7').white.bold(` ${model} `);
  const versionBadge = chalk.bgHex('#1e293b').white(` v${version} `);

  console.log(
    '  ' + modelBadge + ' ' + versionBadge + '\n'
  );

  console.log(
    '  ' + DIM('┌─────────────────────────────────────────────────────────┐')
  );
  console.log(
    '  ' + DIM('│') +
    chalk.white('  AI-powered tasks for your terminal. Type /help anytime. ') +
    DIM('│')
  );
  console.log(
    '  ' + DIM('└─────────────────────────────────────────────────────────┘')
  );
  console.log();
}

/**
 * Prints a compact inline model indicator (used mid-session).
 */
export function printModelIndicator(model: string): void {
  const modelBadge = chalk.bgHex('#a855f7').white.bold(` ✦ ${model} `);
  console.log('\n' + modelBadge + '\n');
}

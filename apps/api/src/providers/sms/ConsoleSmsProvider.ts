import type { SmsMessage, SmsProvider } from './SmsProvider';

/**
 * Development-only provider: prints messages to the terminal instead of sending them.
 * Writes to stderr directly (not the structured logger) so codes never reach log storage.
 * Environment validation forbids this provider in production.
 */
export class ConsoleSmsProvider implements SmsProvider {
  readonly name = 'console';
  readonly isDevelopment = true;

  constructor(
    private readonly write: (line: string) => void = (line) => process.stderr.write(line),
  ) {}

  async send({ to, body }: SmsMessage): Promise<void> {
    this.write(`\n[DEV SMS → ${to}] ${body}\n\n`);
  }
}

import type { EmailMessage, EmailProvider } from './EmailProvider';

/** Development-only provider: prints emails to the terminal. Forbidden in production. */
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';
  readonly isDevelopment = true;

  constructor(
    private readonly write: (line: string) => void = (line) => process.stderr.write(line),
  ) {}

  async send({ to, subject, text }: EmailMessage): Promise<void> {
    this.write(`\n[DEV EMAIL → ${to}] ${subject}\n${text}\n\n`);
  }
}

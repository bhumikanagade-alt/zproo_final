import type { Env } from '../../config/env';
import { ConsoleEmailProvider } from './ConsoleEmailProvider';
import type { EmailProvider } from './EmailProvider';

export type { EmailMessage, EmailProvider } from './EmailProvider';

export function createEmailProvider(env: Pick<Env, 'EMAIL_PROVIDER'>): EmailProvider {
  switch (env.EMAIL_PROVIDER) {
    case 'console':
      return new ConsoleEmailProvider();
  }
}

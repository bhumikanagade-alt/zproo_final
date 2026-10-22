import type { Env } from '../../config/env';
import { ConsoleSmsProvider } from './ConsoleSmsProvider';
import type { SmsProvider } from './SmsProvider';

export type { SmsMessage, SmsProvider } from './SmsProvider';

export function createSmsProvider(env: Pick<Env, 'SMS_PROVIDER'>): SmsProvider {
  switch (env.SMS_PROVIDER) {
    case 'console':
      return new ConsoleSmsProvider();
  }
}

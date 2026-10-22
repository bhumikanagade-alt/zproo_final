import type { OtpChannel, OtpPurpose } from '@prisma/client';
import type { OtpSent } from '@zproo/types';
import { AUTH } from '../config/constants';
import type { EmailProvider } from '../providers/email';
import type { SmsProvider } from '../providers/sms';
import type { OtpRepository } from '../repositories/otp.repository';
import { hmacSha256, randomDigits, safeEqualHex } from '../utils/crypto';
import { InvalidOtpError, OtpExpiredError } from '../utils/errors';

const MESSAGES: Record<OtpPurpose, (code: string) => { sms: string; subject: string }> = {
  SIGNUP: (code) => ({
    sms: `${code} is your ZPROO GO verification code. Valid for 5 minutes. Do not share it.`,
    subject: 'Verify your ZPROO GO account',
  }),
  LOGIN: (code) => ({
    sms: `${code} is your ZPROO GO login code. Valid for 5 minutes. Do not share it.`,
    subject: 'Your ZPROO GO login code',
  }),
  PASSWORD_RESET: (code) => ({
    sms: `${code} is your ZPROO GO password reset code. Valid for 5 minutes. If you did not request this, ignore it.`,
    subject: 'Reset your ZPROO GO password',
  }),
  CONTACT_VERIFICATION: (code) => ({
    sms: `${code} is your ZPROO GO verification code. Valid for 5 minutes.`,
    subject: 'Verify your email for ZPROO GO',
  }),
};

export interface IssueOtp {
  target: string;
  channel: Extract<OtpChannel, 'SMS' | 'EMAIL'>;
  purpose: OtpPurpose;
  userId?: string | undefined;
  ip?: string | undefined;
}

/**
 * One-time codes: 6 random digits, stored as an HMAC bound to target and purpose (useless if the
 * table leaks), 5-minute expiry, 5 attempts, single use, and only the newest code is valid.
 * Send-rate limits are enforced per target by route rate limiters.
 */
export class OtpService {
  private readonly key: string;

  constructor(
    private readonly repo: OtpRepository,
    private readonly sms: SmsProvider,
    private readonly email: EmailProvider,
    secret: string,
  ) {
    this.key = hmacSha256(secret, 'zproo-go:otp:v1');
  }

  async issue({ target, channel, purpose, userId, ip }: IssueOtp): Promise<OtpSent> {
    const code = randomDigits(AUTH.otpLength);
    await this.repo.replace({
      target,
      channel,
      purpose,
      codeHash: this.hash(target, purpose, code),
      expiresAt: new Date(Date.now() + AUTH.otpTtlSeconds * 1000),
      maxAttempts: AUTH.otpMaxAttempts,
      userId,
      ipAddress: ip,
    });
    const message = MESSAGES[purpose](code);
    const provider = channel === 'SMS' ? this.sms : this.email;
    if (channel === 'SMS') await this.sms.send({ to: target, body: message.sms });
    else await this.email.send({ to: target, subject: message.subject, text: message.sms });

    return {
      expiresIn: AUTH.otpTtlSeconds,
      resendIn: AUTH.otpResendSeconds,
      ...(provider.isDevelopment && { devCode: code }),
    };
  }

  /** Verifies and consumes the newest live code for `target`. Returns the purpose it was issued for. */
  async verify(target: string, purposes: OtpPurpose[], code: string): Promise<OtpPurpose> {
    const otp = await this.repo.findLatest(target, purposes);
    if (!otp || otp.expiresAt <= new Date()) throw new OtpExpiredError();
    if (!(await this.repo.registerAttempt(otp.id, otp.maxAttempts))) {
      throw new OtpExpiredError('Too many incorrect attempts. Request a new code.');
    }
    if (!safeEqualHex(otp.codeHash, this.hash(target, otp.purpose, code))) {
      const left = otp.maxAttempts - otp.attempts - 1;
      throw new InvalidOtpError(
        left > 0
          ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`
          : 'Incorrect code. Request a new one.',
      );
    }
    if (!(await this.repo.consume(otp.id))) throw new OtpExpiredError();
    return otp.purpose;
  }

  private hash(target: string, purpose: OtpPurpose, code: string): string {
    return hmacSha256(this.key, `${purpose}:${target}:${code}`);
  }
}

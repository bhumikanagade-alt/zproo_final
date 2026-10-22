import type { OtpChannel, OtpPurpose } from '@prisma/client';
import type { Db } from './db';

export interface NewOtp {
  target: string;
  channel: OtpChannel;
  purpose: OtpPurpose;
  codeHash: string;
  expiresAt: Date;
  maxAttempts: number;
  userId?: string | undefined;
  ipAddress?: string | undefined;
}

export class OtpRepository {
  constructor(private readonly db: Db) {}

  /** Creates a code and invalidates any earlier live codes for the same target, so only the newest works. */
  async replace(data: NewOtp) {
    const now = new Date();
    await this.db.otpCode.updateMany({
      where: {
        target: data.target,
        purpose: data.purpose,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { expiresAt: now },
    });
    return this.db.otpCode.create({ data });
  }

  findLatest(target: string, purposes: OtpPurpose[]) {
    return this.db.otpCode.findFirst({
      where: { target, purpose: { in: purposes }, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Records a verification attempt; false when the attempt budget is already spent. */
  async registerAttempt(id: string, maxAttempts: number): Promise<boolean> {
    const { count } = await this.db.otpCode.updateMany({
      where: { id, consumedAt: null, attempts: { lt: maxAttempts } },
      data: { attempts: { increment: 1 } },
    });
    return count === 1;
  }

  /** Single-use: false if the code was already consumed by a concurrent request. */
  async consume(id: string): Promise<boolean> {
    const { count } = await this.db.otpCode.updateMany({
      where: { id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return count === 1;
  }
}

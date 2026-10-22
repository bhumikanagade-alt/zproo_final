import { hash, verify } from '@node-rs/argon2';

/**
 * argon2id with the library defaults (m=19 MiB, t=2, p=1), which meet the OWASP minimum.
 * The parameters are stored inside each hash, so they can be raised later without migration.
 */
export class PasswordService {
  // Verified against when the account does not exist, so response time does not reveal it.
  private readonly dummyHash = hash('zproo-go-timing-equaliser');

  hash(password: string): Promise<string> {
    return hash(password);
  }

  async verify(passwordHash: string | null | undefined, password: string): Promise<boolean> {
    if (!passwordHash) {
      await verify(await this.dummyHash, password).catch(() => false);
      return false;
    }
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }
}

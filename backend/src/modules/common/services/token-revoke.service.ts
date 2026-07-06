import { Injectable } from '@nestjs/common';

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class TokenRevokeService {
  private readonly revoked = new Set<string>();
  private readonly timestamps = new Map<string, number>();

  revoke(userId: string): void {
    this.revoked.add(userId);
    this.timestamps.set(userId, Date.now());

    setTimeout(() => {
      this.revoked.delete(userId);
      this.timestamps.delete(userId);
    }, ACCESS_TOKEN_TTL_MS);
  }

  isRevoked(userId: string): boolean {
    return this.revoked.has(userId);
  }
}

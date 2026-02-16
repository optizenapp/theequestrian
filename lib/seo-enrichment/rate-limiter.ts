export class SimpleRateLimiter {
  private readonly intervalMs: number;
  private nextAllowedAt = 0;

  constructor(requestsPerSecond: number) {
    this.intervalMs = Math.max(1, Math.floor(1000 / Math.max(requestsPerSecond, 0.1)));
  }

  async waitTurn() {
    const now = Date.now();
    const waitMs = Math.max(0, this.nextAllowedAt - now);
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    this.nextAllowedAt = Date.now() + this.intervalMs;
  }
}


const TTL_MS = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export class WebhookDeduplicator {
  private seen = new Map<string, number>();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  isDuplicate(deliveryId: string): boolean {
    if (this.seen.has(deliveryId)) {
      return true;
    }
    this.seen.set(deliveryId, Date.now());
    return false;
  }

  isStale(timestamp: string | undefined): boolean {
    if (!timestamp) return false;
    const eventTime = new Date(timestamp).getTime();
    if (isNaN(eventTime)) return false;
    return Date.now() - eventTime > STALE_THRESHOLD_MS;
  }

  private cleanup(): void {
    const cutoff = Date.now() - TTL_MS;
    for (const [id, timestamp] of this.seen) {
      if (timestamp < cutoff) {
        this.seen.delete(id);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
    this.seen.clear();
  }
}

export const webhookDedup = new WebhookDeduplicator();

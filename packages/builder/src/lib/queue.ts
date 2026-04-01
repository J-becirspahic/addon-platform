export interface BuildJob {
  buildId: string;
  versionId: string;
  addonId: string;
  addonType: string;
  repoFullName: string;
  version: string;
  callbackUrl: string;
  commitSha?: string;
}

export type BuildProcessor = (job: BuildJob) => Promise<void>;

export class BuildQueue {
  private queue: BuildJob[] = [];
  private active: Map<string, BuildJob> = new Map();
  private maxConcurrent: number;
  private processor: BuildProcessor | null = null;
  private draining = false;

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  setProcessor(fn: BuildProcessor): void {
    this.processor = fn;
  }

  enqueue(job: BuildJob): { position: number } {
    this.queue.push(job);
    const position = this.queue.length;
    this.drain();
    return { position };
  }

  getStatus(): { queued: number; active: number; jobs: { buildId: string; versionId: string; status: string }[] } {
    const jobs = [
      ...Array.from(this.active.values()).map((j) => ({
        buildId: j.buildId,
        versionId: j.versionId,
        status: 'active' as const,
      })),
      ...this.queue.map((j) => ({
        buildId: j.buildId,
        versionId: j.versionId,
        status: 'queued' as const,
      })),
    ];

    return {
      queued: this.queue.length,
      active: this.active.size,
      jobs,
    };
  }

  private drain(): void {
    if (this.draining) return;
    this.draining = true;

    while (this.queue.length > 0 && this.active.size < this.maxConcurrent) {
      const job = this.queue.shift()!;
      this.active.set(job.buildId, job);
      this.processJob(job);
    }

    this.draining = false;
  }

  private async processJob(job: BuildJob): Promise<void> {
    try {
      if (this.processor) {
        await this.processor(job);
      }
    } catch (error) {
      console.error(`Build ${job.buildId} failed:`, error);
    } finally {
      this.active.delete(job.buildId);
      this.drain();
    }
  }
}

import cron from 'node-cron';
import type { FastifyInstance } from 'fastify';
import { getConfig } from '../lib/config.js';
import { AccessReconciliationJob } from './reconciliation.js';

export interface ReconciliationStatus {
  lastRunAt: string | null;
  lastResult: {
    orgsChecked: number;
    reposChecked: number;
    driftsFound: number;
    correctionCount: number;
  } | null;
  lastError: string | null;
  cronExpression: string;
  isScheduled: boolean;
}

let lastRunAt: string | null = null;
let lastResult: ReconciliationStatus['lastResult'] = null;
let lastError: string | null = null;

export function getReconciliationStatus(): ReconciliationStatus {
  const config = getConfig();
  return {
    lastRunAt,
    lastResult,
    lastError,
    cronExpression: config.RECONCILIATION_CRON,
    isScheduled: lastRunAt !== null || lastError !== null || lastResult !== null,
  };
}

export function updateReconciliationStatus(
  result: { orgsChecked: number; reposChecked: number; driftsFound: number; corrections: unknown[] },
  error?: string
): void {
  lastRunAt = new Date().toISOString();
  if (error) {
    lastError = error;
    lastResult = null;
  } else {
    lastError = null;
    lastResult = {
      orgsChecked: result.orgsChecked,
      reposChecked: result.reposChecked,
      driftsFound: result.driftsFound,
      correctionCount: result.corrections.length,
    };
  }
}

export function startScheduler(app: FastifyInstance): () => void {
  const config = getConfig();

  if (!app.github.isConfigured) {
    app.log.info('GitHub not configured, skipping reconciliation scheduler');
    return () => {};
  }

  const cronExpression = config.RECONCILIATION_CRON;

  if (!cron.validate(cronExpression)) {
    app.log.warn({ cronExpression }, 'Invalid RECONCILIATION_CRON expression, skipping scheduler');
    return () => {};
  }

  const task = cron.schedule(cronExpression, async () => {
    app.log.info('Running scheduled access reconciliation');
    try {
      const job = new AccessReconciliationJob(app.prisma, app.github, app.log);
      const result = await job.run();
      updateReconciliationStatus(result);
      app.log.info({ result }, 'Scheduled reconciliation finished');
    } catch (error) {
      updateReconciliationStatus({ orgsChecked: 0, reposChecked: 0, driftsFound: 0, corrections: [] }, String(error));
      app.log.error({ error }, 'Scheduled reconciliation failed');
    }
  });

  app.log.info({ cronExpression }, 'Access reconciliation scheduler started');

  return () => {
    task.stop();
    app.log.info('Access reconciliation scheduler stopped');
  };
}

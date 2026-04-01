import { z } from 'zod';

const buildStepSchema = z.object({
  name: z.string(),
  status: z.enum(['pending', 'running', 'success', 'failed', 'skipped']),
  duration: z.number().optional(),
  logs: z.string().optional(),
  error: z.string().optional(),
});

const buildArtifactSchema = z.object({
  name: z.string(),
  url: z.string(),
  size: z.number(),
  checksum: z.string(),
});

const buildReportSchema = z.object({
  buildId: z.string(),
  status: z.enum(['success', 'failed']),
  steps: z.array(buildStepSchema),
  artifacts: z.array(buildArtifactSchema),
  duration: z.number(),
  error: z.string().optional(),
  startedAt: z.string(),
  finishedAt: z.string(),
});

export const buildCallbackSchema = z.object({
  versionId: z.string().min(1),
  buildId: z.string().min(1),
  status: z.enum(['success', 'failed']),
  report: buildReportSchema,
  downloadUrl: z.string().optional(),
  fileSize: z.number().optional(),
  checksum: z.string().optional(),
});

export const buildReportParamsSchema = z.object({
  orgId: z.string().min(1),
  addonId: z.string().min(1),
  versionId: z.string().min(1),
});

export const listBuildsQuerySchema = z.object({
  status: z.enum(['BUILDING', 'PUBLISHED', 'FAILED']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export type BuildCallbackInput = z.infer<typeof buildCallbackSchema>;
export type BuildReportParams = z.infer<typeof buildReportParamsSchema>;
export type ListBuildsQuery = z.infer<typeof listBuildsQuerySchema>;

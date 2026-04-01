import { z } from 'zod';

const semverRegex = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

export const createVersionSchema = z.object({
  version: z
    .string()
    .regex(semverRegex, 'Version must be a valid semver (e.g., 1.0.0)'),
  changelog: z
    .string()
    .trim()
    .max(5000, 'Changelog must be at most 5000 characters')
    .optional(),
});

export const versionParamsSchema = z.object({
  orgId: z.string().min(1),
  addonId: z.string().min(1),
});

export const versionIdParamsSchema = z.object({
  orgId: z.string().min(1),
  addonId: z.string().min(1),
  versionId: z.string().min(1),
});

export type CreateVersionInput = z.infer<typeof createVersionSchema>;

import { z } from 'zod';

const slugRegex = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export const createAddonSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be at most 50 characters')
    .regex(slugRegex, 'Slug must be lowercase alphanumeric with hyphens, no leading/trailing hyphen'),
  description: z
    .string()
    .trim()
    .max(1000, 'Description must be at most 1000 characters')
    .optional(),
  type: z.enum(['WIDGET', 'CONNECTOR', 'THEME']).default('WIDGET'),
  createGithubRepo: z.boolean().default(false),
});

export const updateAddonSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .max(1000, 'Description must be at most 1000 characters')
    .nullable()
    .optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED']).optional(),
});

export const orgIdParamSchema = z.object({
  orgId: z.string().min(1),
});

export const addonIdParamSchema = z.object({
  orgId: z.string().min(1),
  addonId: z.string().min(1),
});

export type CreateAddonInput = z.infer<typeof createAddonSchema>;
export type UpdateAddonInput = z.infer<typeof updateAddonSchema>;

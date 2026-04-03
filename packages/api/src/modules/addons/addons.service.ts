import type { PrismaClient, Addon, AddonStatus } from '@prisma/client';
import { ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { AUDIT_ACTIONS } from '@addon-platform/shared';
import type { CreateAddonInput, UpdateAddonInput } from './addons.schemas.js';
import type { GitHubAppClient } from '../../plugins/github-app.js';

export class AddonsService {
  constructor(
    private prisma: PrismaClient,
    private github: GitHubAppClient
  ) {}

  async createAddon(
    orgId: string,
    userId: string,
    input: CreateAddonInput
  ): Promise<Addon> {
    const member = await this.getMemberWithRole(orgId, userId);

    const existing = await this.prisma.addon.findUnique({
      where: {
        organizationId_slug: { organizationId: orgId, slug: input.slug },
      },
    });

    if (existing) {
      throw new ConflictError('An addon with this slug already exists in this organization');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundError('Organization', orgId);
    }

    let githubRepo: { id: number; url: string; fullName: string } | null = null;

    if (input.createGithubRepo && this.github.isConfigured) {
      githubRepo = await this.github.createAddonRepo(org.slug, input.slug, input.description);

      if (githubRepo) {
        await this.github.configureRepoProtection(githubRepo.fullName);

        const members = await this.prisma.organizationMember.findMany({
          where: { organizationId: orgId },
          include: { user: true },
        });

        await this.github.syncOrgCollaborators(
          githubRepo.fullName,
          members
            .filter((m) => m.user.githubUsername)
            .map((m) => ({
              githubUsername: m.user.githubUsername!,
              role: m.role,
            }))
        );
      }
    }

    const addon = await this.prisma.addon.create({
      data: {
        organizationId: orgId,
        name: input.name,
        slug: input.slug,
        description: input.description,
        ...(githubRepo && {
          githubRepoId: githubRepo.id,
          githubRepoUrl: githubRepo.url,
          githubRepoFullName: githubRepo.fullName,
        }),
      },
    });

    await this.createAuditLog(userId, AUDIT_ACTIONS.ADDON_CREATED, 'addon', addon.id, orgId, {
      name: input.name,
      slug: input.slug,
      githubRepoCreated: !!githubRepo,
    });

    if (githubRepo) {
      await this.createAuditLog(userId, AUDIT_ACTIONS.GITHUB_REPO_CREATED, 'addon', addon.id, orgId, {
        repoFullName: githubRepo.fullName,
        repoUrl: githubRepo.url,
      });
    }

    return addon;
  }

  async listAddons(orgId: string, userId: string) {
    await this.getMemberWithRole(orgId, userId);

    const addons = await this.prisma.addon.findMany({
      where: { organizationId: orgId },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { versions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return addons.map((addon) => ({
      ...addon,
      latestVersion: addon.versions[0] || null,
      versionCount: addon._count.versions,
    }));
  }

  async getAddon(orgId: string, addonSlug: string, userId: string) {
    await this.getMemberWithRole(orgId, userId);

    const addon = await this.prisma.addon.findFirst({
      where: { slug: addonSlug, organizationId: orgId },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!addon) {
      throw new NotFoundError('Addon', addonSlug);
    }

    return {
      ...addon,
      latestVersion: addon.versions[0] || null,
    };
  }

  async updateAddon(
    orgId: string,
    addonSlug: string,
    userId: string,
    input: UpdateAddonInput
  ): Promise<Addon> {
    const member = await this.getMemberWithRole(orgId, userId);

    const addon = await this.prisma.addon.findFirst({
      where: { slug: addonSlug, organizationId: orgId },
    });

    if (!addon) {
      throw new NotFoundError('Addon', addonSlug);
    }

    const updatedAddon = await this.prisma.addon.update({
      where: { id: addon.id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.status !== undefined && { status: input.status }),
      },
    });

    await this.createAuditLog(userId, AUDIT_ACTIONS.ADDON_UPDATED, 'addon', addon.id, orgId, input);

    return updatedAddon;
  }

  async deleteAddon(orgId: string, addonSlug: string, userId: string): Promise<void> {
    await this.getMemberWithRole(orgId, userId);

    const addon = await this.prisma.addon.findFirst({
      where: { slug: addonSlug, organizationId: orgId },
      include: {
        versions: {
          where: { status: 'PUBLISHED' },
          take: 1,
        },
      },
    });

    if (!addon) {
      throw new NotFoundError('Addon', addonSlug);
    }

    if (addon.githubRepoUrl) {
      throw new ForbiddenError('Cannot delete an addon with a linked GitHub repository');
    }

    if (addon.versions.length > 0) {
      throw new ForbiddenError('Cannot delete an addon with published versions');
    }

    await this.prisma.addon.delete({
      where: { id: addon.id },
    });

    await this.createAuditLog(userId, AUDIT_ACTIONS.ADDON_DELETED, 'addon', addon.id, orgId, {
      name: addon.name,
      slug: addon.slug,
    });
  }

  private async getMemberWithRole(orgId: string, userId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: orgId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenError('You are not a member of this organization');
    }

    return member;
  }

  private async createAuditLog(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    organizationId: string,
    metadata?: Record<string, unknown>
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        organizationId,
        metadata: metadata || {},
      },
    });
  }
}

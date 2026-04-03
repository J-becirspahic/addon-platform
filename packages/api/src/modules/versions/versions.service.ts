import type { PrismaClient, AddonVersion } from '@prisma/client';
import { ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { AUDIT_ACTIONS } from '@addon-platform/shared';
import type { CreateVersionInput } from './versions.schemas.js';
import type { GitHubAppClient } from '../../plugins/github-app.js';

export class VersionsService {
  constructor(
    private prisma: PrismaClient,
    private github: GitHubAppClient
  ) {}

  async createVersion(
    orgId: string,
    addonSlug: string,
    userId: string,
    input: CreateVersionInput
  ): Promise<AddonVersion & { branchName: string }> {
    await this.getMemberWithRole(orgId, userId);

    const addon = await this.prisma.addon.findFirst({
      where: { slug: addonSlug, organizationId: orgId },
    });

    if (!addon) {
      throw new NotFoundError('Addon', addonSlug);
    }

    const existing = await this.prisma.addonVersion.findUnique({
      where: {
        addonId_version: { addonId: addon.id, version: input.version },
      },
    });

    if (existing) {
      throw new ConflictError(`Version ${input.version} already exists for this addon`);
    }

    const version = await this.prisma.addonVersion.create({
      data: {
        addonId: addon.id,
        version: input.version,
        changelog: input.changelog,
        status: 'DRAFT',
      },
    });

    await this.createAuditLog(
      userId,
      AUDIT_ACTIONS.VERSION_CREATED,
      'version',
      version.id,
      orgId,
      { version: input.version, addonId: addon.id }
    );

    const branchName = `submission/v${input.version}`;

    if (addon.githubRepoFullName) {
      await this.github.createBranch(addon.githubRepoFullName, branchName);
    }

    return { ...version, branchName };
  }

  async listVersions(orgId: string, addonSlug: string, userId: string) {
    await this.getMemberWithRole(orgId, userId);

    const addon = await this.prisma.addon.findFirst({
      where: { slug: addonSlug, organizationId: orgId },
    });

    if (!addon) {
      throw new NotFoundError('Addon', addonSlug);
    }

    const versions = await this.prisma.addonVersion.findMany({
      where: { addonId: addon.id },
      orderBy: { createdAt: 'desc' },
    });

    return versions;
  }

  async getVersion(orgId: string, addonSlug: string, versionId: string, userId: string) {
    await this.getMemberWithRole(orgId, userId);

    const version = await this.prisma.addonVersion.findFirst({
      where: { id: versionId, addon: { slug: addonSlug, organizationId: orgId } },
      include: { addon: true },
    });

    if (!version) {
      throw new NotFoundError('Version', versionId);
    }

    return version;
  }

  async getPrStatus(orgId: string, addonSlug: string, versionId: string, userId: string) {
    await this.getMemberWithRole(orgId, userId);

    const version = await this.prisma.addonVersion.findFirst({
      where: { id: versionId, addon: { slug: addonSlug, organizationId: orgId } },
      include: { addon: true },
    });

    if (!version) {
      throw new NotFoundError('Version', versionId);
    }

    if (!version.githubPrNumber || !version.addon.githubRepoFullName) {
      return null;
    }

    return this.github.getPrStatus(version.addon.githubRepoFullName, version.githubPrNumber);
  }

  async submitVersion(orgId: string, addonSlug: string, versionId: string, userId: string) {
    await this.getMemberWithRole(orgId, userId);

    const version = await this.prisma.addonVersion.findFirst({
      where: { id: versionId, addon: { slug: addonSlug, organizationId: orgId } },
      include: { addon: true },
    });

    if (!version) {
      throw new NotFoundError('Version', versionId);
    }

    if (version.status !== 'DRAFT' && version.status !== 'CHANGES_REQUESTED') {
      throw new ForbiddenError(`Cannot submit a version with status ${version.status}`);
    }

    if (version.githubPrNumber) {
      throw new ConflictError('A pull request already exists for this version');
    }

    const addon = version.addon;
    if (!addon.githubRepoFullName) {
      throw new ForbiddenError('Addon has no linked GitHub repository');
    }

    const branchName = `submission/v${version.version}`;
    const pr = await this.github.createPullRequest(
      addon.githubRepoFullName,
      branchName,
      'main',
      `Addon submission: ${addon.name} v${version.version}`,
      `Submission for addon **${addon.name}** version **${version.version}**.\n\n${version.changelog || ''}`
    );

    if (!pr) {
      throw new Error('Failed to create pull request on GitHub');
    }

    await this.prisma.addonVersion.update({
      where: { id: versionId },
      data: {
        status: 'SUBMITTED',
        githubPrNumber: pr.number,
        githubPrUrl: pr.url,
        submittedAt: new Date(),
      },
    });

    await this.createAuditLog(
      userId,
      AUDIT_ACTIONS.VERSION_SUBMITTED,
      'version',
      versionId,
      orgId,
      { prNumber: pr.number, prUrl: pr.url }
    );

    return { status: 'SUBMITTED', prNumber: pr.number, prUrl: pr.url };
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
        metadata: (metadata || {}) as object,
      },
    });
  }
}

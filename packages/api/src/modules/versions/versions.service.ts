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
    addonId: string,
    userId: string,
    input: CreateVersionInput
  ): Promise<AddonVersion & { branchName: string }> {
    await this.getMemberWithRole(orgId, userId);

    const addon = await this.prisma.addon.findFirst({
      where: { id: addonId, organizationId: orgId },
    });

    if (!addon) {
      throw new NotFoundError('Addon', addonId);
    }

    const existing = await this.prisma.addonVersion.findUnique({
      where: {
        addonId_version: { addonId, version: input.version },
      },
    });

    if (existing) {
      throw new ConflictError(`Version ${input.version} already exists for this addon`);
    }

    const version = await this.prisma.addonVersion.create({
      data: {
        addonId,
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
      { version: input.version, addonId }
    );

    const branchName = `submission/v${input.version}`;

    return { ...version, branchName };
  }

  async listVersions(orgId: string, addonId: string, userId: string) {
    await this.getMemberWithRole(orgId, userId);

    const addon = await this.prisma.addon.findFirst({
      where: { id: addonId, organizationId: orgId },
    });

    if (!addon) {
      throw new NotFoundError('Addon', addonId);
    }

    const versions = await this.prisma.addonVersion.findMany({
      where: { addonId },
      orderBy: { createdAt: 'desc' },
    });

    return versions;
  }

  async getVersion(orgId: string, addonId: string, versionId: string, userId: string) {
    await this.getMemberWithRole(orgId, userId);

    const version = await this.prisma.addonVersion.findFirst({
      where: { id: versionId, addonId },
      include: { addon: true },
    });

    if (!version) {
      throw new NotFoundError('Version', versionId);
    }

    if (version.addon.organizationId !== orgId) {
      throw new NotFoundError('Version', versionId);
    }

    return version;
  }

  async getPrStatus(orgId: string, addonId: string, versionId: string, userId: string) {
    await this.getMemberWithRole(orgId, userId);

    const version = await this.prisma.addonVersion.findFirst({
      where: { id: versionId, addonId },
      include: { addon: true },
    });

    if (!version) {
      throw new NotFoundError('Version', versionId);
    }

    if (version.addon.organizationId !== orgId) {
      throw new NotFoundError('Version', versionId);
    }

    if (!version.githubPrNumber || !version.addon.githubRepoFullName) {
      return null;
    }

    return this.github.getPrStatus(version.addon.githubRepoFullName, version.githubPrNumber);
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

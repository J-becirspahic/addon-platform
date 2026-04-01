import type { PrismaClient } from '@prisma/client';
import { AUDIT_ACTIONS, NOTIFICATION_TYPES } from '@addon-platform/shared';
import { versionChannel, type SSEBroker } from '../../lib/sse.js';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import type { BuildCallbackInput, ListBuildsQuery } from './builds.schemas.js';

export class BuildsService {
  constructor(
    private prisma: PrismaClient,
    private sse: SSEBroker
  ) {}

  async handleBuildCallback(input: BuildCallbackInput): Promise<void> {
    const version = await this.prisma.addonVersion.findUnique({
      where: { id: input.versionId },
      include: { addon: true },
    });

    if (!version) {
      throw new NotFoundError('AddonVersion', input.versionId);
    }

    const newStatus = input.status === 'success' ? 'PUBLISHED' : 'FAILED';

    const updateData: Record<string, unknown> = {
      status: newStatus,
      buildReport: input.report as object,
      buildFinishedAt: new Date(),
    };

    if (input.status === 'success') {
      updateData.publishedAt = new Date();
      if (input.downloadUrl) updateData.downloadUrl = input.downloadUrl;
      if (input.fileSize) updateData.fileSize = input.fileSize;
      if (input.checksum) updateData.checksum = input.checksum;
    }

    await this.prisma.addonVersion.update({
      where: { id: input.versionId },
      data: updateData,
    });

    // Emit SSE event
    this.sse.publish(versionChannel(input.versionId), {
      type: 'status_change',
      data: {
        versionId: input.versionId,
        status: newStatus,
        timestamp: new Date().toISOString(),
      },
    });

    // Create notifications for org members
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId: version.addon.organizationId },
      select: { userId: true },
    });

    if (members.length > 0) {
      const notificationType = input.status === 'success'
        ? NOTIFICATION_TYPES.VERSION_PUBLISHED
        : NOTIFICATION_TYPES.VERSION_FAILED;

      const title = input.status === 'success' ? 'Version Published' : 'Build Failed';
      const message = input.status === 'success'
        ? `${version.addon.name} v${version.version} has been published`
        : `${version.addon.name} v${version.version} build failed: ${input.report.error || 'Unknown error'}`;

      await this.prisma.notification.createMany({
        data: members.map((m) => ({
          userId: m.userId,
          organizationId: version.addon.organizationId,
          type: notificationType,
          title,
          message,
          addonId: version.addon.id,
          addonVersionId: version.id,
        })),
      });
    }

    // Create audit log
    const auditAction = input.status === 'success'
      ? AUDIT_ACTIONS.BUILD_COMPLETED
      : AUDIT_ACTIONS.BUILD_FAILED;

    await this.prisma.auditLog.create({
      data: {
        userId: 'system',
        action: auditAction,
        entityType: 'version',
        entityId: input.versionId,
        organizationId: version.addon.organizationId,
        metadata: {
          buildId: input.buildId,
          status: input.status,
          duration: input.report.duration,
        } as object,
      },
    });
  }

  async getBuildReport(
    orgId: string,
    addonId: string,
    versionId: string,
    userId: string
  ): Promise<{
    buildReport: unknown;
    buildStartedAt: Date | null;
    buildFinishedAt: Date | null;
    downloadUrl: string | null;
    fileSize: number | null;
  }> {
    // Check membership
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });

    if (!member) {
      throw new ForbiddenError('Not a member of this organization');
    }

    const version = await this.prisma.addonVersion.findFirst({
      where: { id: versionId, addonId },
    });

    if (!version) {
      throw new NotFoundError('AddonVersion', versionId);
    }

    return {
      buildReport: version.buildReport,
      buildStartedAt: version.buildStartedAt,
      buildFinishedAt: version.buildFinishedAt,
      downloadUrl: version.downloadUrl,
      fileSize: version.fileSize,
    };
  }

  async listBuilds(query: ListBuildsQuery): Promise<{
    builds: Array<{
      id: string;
      version: string;
      status: string;
      buildStartedAt: Date | null;
      buildFinishedAt: Date | null;
      addon: { id: string; name: string; slug: string };
    }>;
    total: number;
  }> {
    const where: Record<string, unknown> = {
      buildStartedAt: { not: null },
    };

    if (query.status) {
      where.status = query.status;
    }

    const [builds, total] = await Promise.all([
      this.prisma.addonVersion.findMany({
        where,
        include: {
          addon: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { buildStartedAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.addonVersion.count({ where }),
    ]);

    return {
      builds: builds.map((b) => ({
        id: b.id,
        version: b.version,
        status: b.status,
        buildStartedAt: b.buildStartedAt,
        buildFinishedAt: b.buildFinishedAt,
        addon: b.addon,
      })),
      total,
    };
  }
}

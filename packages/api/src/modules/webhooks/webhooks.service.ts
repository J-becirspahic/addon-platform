import crypto from 'crypto';
import type { PrismaClient, VersionStatus, Addon } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { getConfig } from '../../lib/config.js';
import { AUDIT_ACTIONS, NOTIFICATION_TYPES } from '@addon-platform/shared';
import type { GitHubAppClient } from '../../plugins/github-app.js';
import { versionChannel, type SSEBroker } from '../../lib/sse.js';

export interface WebhookPayload {
  action?: string;
  repository?: {
    id: number;
    full_name: string;
  };
  sender?: {
    id: number;
    login: string;
  };
  pull_request?: {
    number: number;
    html_url: string;
    head: {
      ref: string;
    };
    merged: boolean;
  };
  review?: {
    state: string;
    user: {
      login: string;
    };
  };
  ref?: string;
  [key: string]: unknown;
}

export class WebhooksService {
  private logger?: FastifyBaseLogger;

  constructor(
    private prisma: PrismaClient,
    private github: GitHubAppClient,
    private sse: SSEBroker,
    logger?: FastifyBaseLogger
  ) {
    this.logger = logger;
  }

  verifySignature(payload: string, signature: string | undefined): boolean {
    const config = getConfig();

    if (!config.GITHUB_APP_WEBHOOK_SECRET || !signature) {
      return false;
    }

    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', config.GITHUB_APP_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex')}`;

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  async handleWebhook(
    event: string,
    payload: WebhookPayload
  ): Promise<{ processed: boolean; message: string }> {
    switch (event) {
      case 'push':
        return this.handlePush(payload);
      case 'pull_request':
        return this.handlePullRequest(payload);
      case 'pull_request_review':
        return this.handlePullRequestReview(payload);
      case 'repository':
        return this.handleRepository(payload);
      case 'member':
        return this.handleMember(payload);
      case 'ping':
        return { processed: true, message: 'Pong!' };
      default:
        return { processed: false, message: `Unhandled event: ${event}` };
    }
  }

  private async handlePush(payload: WebhookPayload): Promise<{ processed: boolean; message: string }> {
    const repoFullName = payload.repository?.full_name;
    const ref = payload.ref;

    if (!repoFullName || !ref) {
      return { processed: false, message: 'No repository or ref in payload' };
    }

    const branchMatch = ref.match(/^refs\/heads\/submission\/v(.+)$/);
    if (!branchMatch) {
      return { processed: true, message: 'Push to non-submission branch, ignoring' };
    }

    const versionString = branchMatch[1];

    const addon = await this.prisma.addon.findFirst({
      where: { githubRepoFullName: repoFullName },
    });

    if (!addon) {
      return { processed: false, message: 'Repository not associated with any addon' };
    }

    const version = await this.prisma.addonVersion.findFirst({
      where: {
        addon: { githubRepoFullName: repoFullName },
        version: versionString,
        status: { in: ['DRAFT', 'CHANGES_REQUESTED'] },
      },
    });

    if (!version) {
      return { processed: false, message: `No matching DRAFT/CHANGES_REQUESTED version ${versionString}` };
    }

    if (version.githubPrNumber) {
      return { processed: true, message: 'PR already created for this version, skipping' };
    }

    const branchName = `submission/v${versionString}`;
    const pr = await this.github.createPullRequest(
      repoFullName,
      branchName,
      'main',
      `Addon submission: ${addon.name} v${versionString}`,
      `Submission for addon **${addon.name}** version **${versionString}**.\n\n${version.changelog || ''}`
    );

    if (!pr) {
      return { processed: false, message: 'Failed to create pull request' };
    }

    await this.updateVersionStatus(version.id, 'SUBMITTED', {
      githubPrNumber: pr.number,
      githubPrUrl: pr.url,
      submittedAt: new Date(),
    });

    this.emitVersionUpdate(version.id, 'SUBMITTED');

    await this.createNotificationsForOrg(
      addon,
      version.id,
      NOTIFICATION_TYPES.VERSION_SUBMITTED,
      'Version Submitted',
      `${addon.name} v${versionString} has been submitted for review`
    );

    await this.createAuditLog(
      'system',
      AUDIT_ACTIONS.VERSION_SUBMITTED,
      'version',
      version.id,
      addon.organizationId,
      { prNumber: pr.number, prUrl: pr.url }
    );

    await this.createAuditLog(
      'system',
      AUDIT_ACTIONS.PR_CREATED,
      'version',
      version.id,
      addon.organizationId,
      { prNumber: pr.number, repoFullName }
    );

    return { processed: true, message: `PR #${pr.number} created, version set to SUBMITTED` };
  }

  private async handlePullRequest(payload: WebhookPayload): Promise<{ processed: boolean; message: string }> {
    const { action, pull_request, repository } = payload;

    if (!pull_request || !repository) {
      return { processed: false, message: 'Missing pull_request or repository in payload' };
    }

    const repoFullName = repository.full_name;
    const prNumber = pull_request.number;

    let version = await this.prisma.addonVersion.findFirst({
      where: {
        githubPrNumber: prNumber,
        addon: { githubRepoFullName: repoFullName },
      },
      include: { addon: true },
    });

    if (!version) {
      const branchMatch = pull_request.head.ref.match(/^submission\/v(.+)$/);
      if (branchMatch) {
        version = await this.prisma.addonVersion.findFirst({
          where: {
            version: branchMatch[1],
            addon: { githubRepoFullName: repoFullName },
          },
          include: { addon: true },
        });
      }
    }

    if (!version) {
      return { processed: false, message: 'No matching version for this PR' };
    }

    const addon = (version as typeof version & { addon: Addon }).addon;

    if (action === 'opened') {
      if (version.status !== 'SUBMITTED') {
        await this.updateVersionStatus(version.id, 'SUBMITTED', {
          githubPrNumber: prNumber,
          githubPrUrl: pull_request.html_url,
          submittedAt: version.submittedAt || new Date(),
        });
        this.emitVersionUpdate(version.id, 'SUBMITTED');
      }
      return { processed: true, message: 'PR opened, version is SUBMITTED' };
    }

    if (action === 'closed') {
      if (pull_request.merged) {
        if (version.status !== 'BUILDING') {
          await this.updateVersionStatus(version.id, 'BUILDING');
          this.emitVersionUpdate(version.id, 'BUILDING');

          await this.createNotificationsForOrg(
            addon,
            version.id,
            NOTIFICATION_TYPES.VERSION_BUILDING,
            'Version Building',
            `${addon.name} v${version.version} PR merged, build started`
          );

          await this.createAuditLog(
            'system',
            AUDIT_ACTIONS.PR_MERGED,
            'version',
            version.id,
            addon.organizationId,
            { prNumber }
          );

          // Trigger build pipeline
          await this.triggerBuild(version.id, addon);
        }
        return { processed: true, message: 'PR merged, version set to BUILDING' };
      } else {
        if (version.status !== 'CHANGES_REQUESTED') {
          await this.updateVersionStatus(version.id, 'CHANGES_REQUESTED');
          this.emitVersionUpdate(version.id, 'CHANGES_REQUESTED');

          await this.createNotificationsForOrg(
            addon,
            version.id,
            NOTIFICATION_TYPES.VERSION_CHANGES_REQUESTED,
            'PR Closed',
            `${addon.name} v${version.version} PR was closed without merging`
          );

          await this.createAuditLog(
            'system',
            AUDIT_ACTIONS.PR_CLOSED,
            'version',
            version.id,
            addon.organizationId,
            { prNumber }
          );
        }
        return { processed: true, message: 'PR closed without merge, version set to CHANGES_REQUESTED' };
      }
    }

    return { processed: true, message: `Pull request event: ${action}` };
  }

  private async handlePullRequestReview(payload: WebhookPayload): Promise<{ processed: boolean; message: string }> {
    const { action, review, pull_request, repository } = payload;

    if (action !== 'submitted' || !review || !pull_request || !repository) {
      return { processed: false, message: 'Missing review data or not a submission' };
    }

    const repoFullName = repository.full_name;
    const prNumber = pull_request.number;

    const version = await this.prisma.addonVersion.findFirst({
      where: {
        githubPrNumber: prNumber,
        addon: { githubRepoFullName: repoFullName },
      },
      include: { addon: true },
    });

    if (!version) {
      return { processed: false, message: 'No matching version for this PR review' };
    }

    const addon = version.addon;

    if (review.state === 'approved') {
      if (version.status !== 'APPROVED') {
        await this.updateVersionStatus(version.id, 'APPROVED');
        this.emitVersionUpdate(version.id, 'APPROVED');

        await this.createNotificationsForOrg(
          addon,
          version.id,
          NOTIFICATION_TYPES.VERSION_APPROVED,
          'Version Approved',
          `${addon.name} v${version.version} has been approved by ${review.user.login}`
        );

        await this.createAuditLog(
          'system',
          AUDIT_ACTIONS.VERSION_APPROVED,
          'version',
          version.id,
          addon.organizationId,
          { reviewer: review.user.login, prNumber }
        );
      }
      return { processed: true, message: 'Review approved, version set to APPROVED' };
    }

    if (review.state === 'changes_requested') {
      if (version.status !== 'CHANGES_REQUESTED') {
        await this.updateVersionStatus(version.id, 'CHANGES_REQUESTED');
        this.emitVersionUpdate(version.id, 'CHANGES_REQUESTED');

        await this.createNotificationsForOrg(
          addon,
          version.id,
          NOTIFICATION_TYPES.VERSION_CHANGES_REQUESTED,
          'Changes Requested',
          `${addon.name} v${version.version}: changes requested by ${review.user.login}`
        );

        await this.createAuditLog(
          'system',
          AUDIT_ACTIONS.VERSION_CHANGES_REQUESTED,
          'version',
          version.id,
          addon.organizationId,
          { reviewer: review.user.login, prNumber }
        );
      }
      return { processed: true, message: 'Changes requested on review' };
    }

    return { processed: true, message: `Review event: ${review.state}` };
  }

  private async handleRepository(payload: WebhookPayload): Promise<{ processed: boolean; message: string }> {
    const { action, repository } = payload;

    if (!repository) {
      return { processed: false, message: 'No repository in payload' };
    }

    if (action === 'deleted') {
      const addon = await this.prisma.addon.findFirst({
        where: { githubRepoId: repository.id },
      });

      if (addon) {
        await this.prisma.addon.update({
          where: { id: addon.id },
          data: {
            githubRepoId: null,
            githubRepoUrl: null,
            githubRepoFullName: null,
          },
        });

        return { processed: true, message: `Repository deleted, unlinked from addon: ${addon.name}` };
      }
    }

    if (action === 'publicized') {
      const addon = await this.prisma.addon.findFirst({
        where: { githubRepoFullName: repository.full_name },
      });

      if (addon) {
        await this.github.setRepoPrivate(repository.full_name);

        await this.createAuditLog(
          'system',
          AUDIT_ACTIONS.REPO_FORCED_PRIVATE,
          'addon',
          addon.id,
          addon.organizationId,
          { repoFullName: repository.full_name, severity: 'critical' }
        );

        await this.createNotificationsForOrg(
          addon,
          undefined,
          NOTIFICATION_TYPES.SECURITY_REPO_PUBLICIZED,
          'Security Alert: Repository Made Public',
          `Repository ${repository.full_name} was made public and has been forced back to private`
        );

        return { processed: true, message: 'Repository publicized, forced back to private' };
      }
    }

    return { processed: true, message: `Repository event: ${action}` };
  }

  private async handleMember(_payload: WebhookPayload): Promise<{ processed: boolean; message: string }> {
    return { processed: true, message: 'Member event received' };
  }

  private async triggerBuild(versionId: string, addon: Addon): Promise<void> {
    const config = getConfig();

    if (!config.BUILDER_URL || !config.BUILD_CALLBACK_SECRET) {
      return;
    }

    try {
      // Set buildStartedAt on the version
      await this.prisma.addonVersion.update({
        where: { id: versionId },
        data: { buildStartedAt: new Date() },
      });

      const version = await this.prisma.addonVersion.findUnique({
        where: { id: versionId },
      });

      if (!version) return;

      await fetch(`${config.BUILDER_URL}/api/builds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Build-Secret': config.BUILD_CALLBACK_SECRET,
        },
        body: JSON.stringify({
          versionId,
          addonId: addon.id,
          addonType: (addon as Addon & { type?: string }).type || 'WIDGET',
          repoFullName: addon.githubRepoFullName,
          version: version.version,
        }),
      });

      await this.createAuditLog(
        'system',
        AUDIT_ACTIONS.BUILD_STARTED,
        'version',
        versionId,
        addon.organizationId,
        { addonName: addon.name }
      );
    } catch (error) {
      // Log but don't throw — builder may be unavailable
      this.logger?.error({ error }, 'Failed to trigger build');
    }
  }

  private async updateVersionStatus(
    versionId: string,
    status: VersionStatus,
    extra?: Record<string, unknown>
  ) {
    const data: Record<string, unknown> = { status, ...extra };

    if (status === 'PUBLISHED') {
      data.publishedAt = new Date();
    }

    await this.prisma.addonVersion.update({
      where: { id: versionId },
      data,
    });
  }

  private emitVersionUpdate(versionId: string, status: string) {
    this.sse.publish(versionChannel(versionId), {
      type: 'status_change',
      data: { versionId, status, timestamp: new Date().toISOString() },
    });
  }

  private async createNotificationsForOrg(
    addon: Addon,
    versionId: string | undefined,
    type: string,
    title: string,
    message: string
  ) {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId: addon.organizationId },
      select: { userId: true },
    });

    if (members.length === 0) return;

    await this.prisma.notification.createMany({
      data: members.map((m) => ({
        userId: m.userId,
        organizationId: addon.organizationId,
        type,
        title,
        message,
        addonId: addon.id,
        addonVersionId: versionId || null,
      })),
    });
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

  async logWebhookEvent(
    event: string,
    payload: WebhookPayload,
    processed: boolean
  ): Promise<void> {
    const repoId = payload.repository?.id;
    const addon = repoId
      ? await this.prisma.addon.findFirst({ where: { githubRepoId: repoId } })
      : null;

    if (addon) {
      await this.prisma.auditLog.create({
        data: {
          userId: 'system',
          action: `webhook.${event}`,
          entityType: 'addon',
          entityId: addon.id,
          organizationId: addon.organizationId,
          metadata: {
            event,
            action: payload.action,
            processed,
            sender: payload.sender?.login,
          },
        },
      });
    }
  }
}

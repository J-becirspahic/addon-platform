import type { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import type { GitHubAppClient } from '../plugins/github-app.js';
import { AUDIT_ACTIONS } from '@addon-platform/shared';

interface ReconciliationCorrection {
  repoFullName: string;
  action: 'added' | 'removed';
  username: string;
}

interface ReconciliationResult {
  orgsChecked: number;
  reposChecked: number;
  driftsFound: number;
  corrections: ReconciliationCorrection[];
}

export class AccessReconciliationJob {
  constructor(
    private prisma: PrismaClient,
    private github: GitHubAppClient,
    private logger: FastifyBaseLogger
  ) {}

  async run(): Promise<ReconciliationResult> {
    const result: ReconciliationResult = {
      orgsChecked: 0,
      reposChecked: 0,
      driftsFound: 0,
      corrections: [],
    };

    const orgs = await this.prisma.organization.findMany({
      include: {
        members: {
          include: { user: true },
        },
        addons: {
          where: {
            githubRepoFullName: { not: null },
          },
        },
      },
    });

    for (const org of orgs) {
      result.orgsChecked++;

      // Check GitHub rate limit before processing each org
      const remaining = await this.github.getRateLimitRemaining();
      if (remaining !== null && remaining < 50) {
        this.logger.warn(
          { remaining, org: org.slug },
          'GitHub rate limit low, stopping reconciliation early'
        );
        break;
      }

      const expectedUsers = org.members
        .filter((m) => m.user.githubUsername)
        .map((m) => ({
          login: m.user.githubUsername!.toLowerCase(),
          role: m.role,
        }));

      for (const addon of org.addons) {
        if (!addon.githubRepoFullName) continue;
        result.reposChecked++;

        const actualCollaborators = await this.github.listCollaborators(addon.githubRepoFullName);
        if (!actualCollaborators) {
          this.logger.warn({ repo: addon.githubRepoFullName }, 'Could not list collaborators, skipping');
          continue;
        }

        const actualLogins = new Set(actualCollaborators.map((c) => c.login.toLowerCase()));
        const expectedLogins = new Set(expectedUsers.map((u) => u.login));

        // Find unexpected collaborators (in actual but not expected)
        for (const collaborator of actualCollaborators) {
          const login = collaborator.login.toLowerCase();
          if (!expectedLogins.has(login)) {
            result.driftsFound++;
            const removed = await this.github.removeCollaborator(addon.githubRepoFullName, collaborator.login);
            if (removed) {
              result.corrections.push({
                repoFullName: addon.githubRepoFullName,
                action: 'removed',
                username: collaborator.login,
              });
              this.logger.info(
                { repo: addon.githubRepoFullName, username: collaborator.login },
                'Removed unexpected collaborator'
              );
            }
          }
        }

        // Find missing collaborators (in expected but not actual)
        for (const expected of expectedUsers) {
          if (!actualLogins.has(expected.login)) {
            result.driftsFound++;
            const roleToPermission: Record<string, string> = {
              OWNER: 'admin',
              ADMIN: 'maintain',
              MEMBER: 'push',
            };
            const permission = roleToPermission[expected.role] || 'push';
            const added = await this.github.addCollaborator(addon.githubRepoFullName, expected.login, permission);
            if (added) {
              result.corrections.push({
                repoFullName: addon.githubRepoFullName,
                action: 'added',
                username: expected.login,
              });
              this.logger.info(
                { repo: addon.githubRepoFullName, username: expected.login, permission },
                'Added missing collaborator'
              );
            }
          }
        }
      }

      // Log reconciliation for the org
      if (result.corrections.length > 0) {
        await this.prisma.auditLog.create({
          data: {
            userId: 'system',
            action: AUDIT_ACTIONS.ACCESS_RECONCILIATION,
            entityType: 'organization',
            entityId: org.id,
            organizationId: org.id,
            metadata: {
              reposChecked: result.reposChecked,
              driftsFound: result.driftsFound,
              corrections: result.corrections,
            } as object,
          },
        });
      }
    }

    this.logger.info(
      {
        orgsChecked: result.orgsChecked,
        reposChecked: result.reposChecked,
        driftsFound: result.driftsFound,
        correctionCount: result.corrections.length,
      },
      'Access reconciliation completed'
    );

    return result;
  }
}

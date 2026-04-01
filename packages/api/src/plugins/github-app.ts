import fp from 'fastify-plugin';
import { Octokit } from 'octokit';
import { createAppAuth } from '@octokit/auth-app';
import type { FastifyInstance } from 'fastify';
import { getConfig } from '../lib/config.js';

export interface GitHubAppClient {
  isConfigured: boolean;
  getInstallationOctokit(): Promise<Octokit | null>;
  createAddonRepo(orgSlug: string, addonSlug: string, description?: string): Promise<{
    id: number;
    url: string;
    fullName: string;
  } | null>;
  configureRepoProtection(repoFullName: string): Promise<boolean>;
  addCollaborator(repoFullName: string, githubUsername: string, permission?: string): Promise<boolean>;
  removeCollaborator(repoFullName: string, githubUsername: string): Promise<boolean>;
  syncOrgCollaborators(
    repoFullName: string,
    members: Array<{ githubUsername: string; role: string }>
  ): Promise<void>;
  createPullRequest(
    repoFullName: string,
    head: string,
    base: string,
    title: string,
    body: string
  ): Promise<{ number: number; url: string } | null>;
  setRepoPrivate(repoFullName: string): Promise<boolean>;
  listCollaborators(repoFullName: string): Promise<Array<{ login: string; permissions: Record<string, boolean> }> | null>;
  getRateLimitRemaining(): Promise<number | null>;
  getPrStatus(
    repoFullName: string,
    prNumber: number
  ): Promise<{
    state: string;
    mergeable: boolean | null;
    reviews: Array<{ user: string; state: string; submittedAt?: string }>;
    checks: Array<{ name: string; status: string; conclusion: string | null }>;
  } | null>;
  getOAuthUrl(state: string): string;
  exchangeCodeForToken(code: string): Promise<string>;
  getUserInfo(accessToken: string): Promise<{
    id: number;
    login: string;
    name: string | null;
    email: string | null;
    avatar_url: string;
  }>;
}

declare module 'fastify' {
  interface FastifyInstance {
    github: GitHubAppClient;
  }
}

async function githubAppPluginCallback(fastify: FastifyInstance) {
  const config = getConfig();

  const isConfigured = Boolean(
    config.GITHUB_APP_ID &&
    config.GITHUB_APP_PRIVATE_KEY &&
    config.GITHUB_APP_INSTALLATION_ID
  );

  const isOAuthConfigured = Boolean(
    config.GITHUB_OAUTH_CLIENT_ID &&
    config.GITHUB_OAUTH_CLIENT_SECRET
  );

  let appOctokit: Octokit | null = null;

  if (isConfigured) {
    appOctokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: config.GITHUB_APP_ID!,
        privateKey: config.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        installationId: config.GITHUB_APP_INSTALLATION_ID!,
      },
    });
  }

  /**
   * Returns an Octokit instance scoped to a specific repository ID.
   * This limits the blast radius if the token is compromised.
   * Falls back to the org-wide token if repositoryId is not provided.
   */
  function getScopedOctokit(repositoryId?: number): Octokit | null {
    if (!isConfigured) return null;

    if (!repositoryId) return appOctokit;

    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: config.GITHUB_APP_ID!,
        privateKey: config.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        installationId: config.GITHUB_APP_INSTALLATION_ID!,
        repositoryIds: [repositoryId],
      },
    });
  }

  /**
   * Resolves a repoFullName to its GitHub repo ID, using a cache to avoid
   * repeated API calls.
   */
  const repoIdCache = new Map<string, number>();

  async function getRepoId(repoFullName: string): Promise<number | undefined> {
    const cached = repoIdCache.get(repoFullName);
    if (cached) return cached;

    if (!appOctokit) return undefined;

    try {
      const [owner, repo] = repoFullName.split('/');
      const { data } = await appOctokit.rest.repos.get({ owner, repo });
      repoIdCache.set(repoFullName, data.id);
      return data.id;
    } catch {
      return undefined;
    }
  }

  /**
   * Returns an Octokit scoped to the given repo, falling back to org-wide if
   * the repo ID cannot be resolved.
   */
  async function getOctokitForRepo(repoFullName: string): Promise<Octokit | null> {
    const repoId = await getRepoId(repoFullName);
    return getScopedOctokit(repoId);
  }

  async function getInstallationOctokit(): Promise<Octokit | null> {
    return appOctokit;
  }

  async function createAddonRepo(
    orgSlug: string,
    addonSlug: string,
    description?: string
  ): Promise<{ id: number; url: string; fullName: string } | null> {
    if (!appOctokit) return null;

    try {
      const repoName = `${orgSlug}-${addonSlug}`;

      const orgName = config.GITHUB_ORG_NAME || 'addons';

      const { data } = await appOctokit.rest.repos.createInOrg({
        org: orgName,
        name: repoName,
        description: description || `Addon: ${addonSlug}`,
        private: true,
        auto_init: true,
        has_issues: true,
        has_wiki: false,
        has_projects: false,
      });

      if (config.REVIEW_TEAM_SLUG) {
        try {
          const codeownersContent = `* @${orgName}/${config.REVIEW_TEAM_SLUG}\n`;
          await appOctokit.rest.repos.createOrUpdateFileContents({
            owner: orgName,
            repo: repoName,
            path: 'CODEOWNERS',
            message: 'Add CODEOWNERS for review team',
            content: Buffer.from(codeownersContent).toString('base64'),
          });
        } catch (error) {
          fastify.log.warn({ error }, 'Failed to create CODEOWNERS file');
        }
      }

      // Commit manifest template for developers to fill in
      try {
        const manifestTemplate = JSON.stringify(
          {
            name: addonSlug,
            version: '0.1.0',
            type: 'widget',
            entryPoint: 'index.js',
            dependencies: {},
            minAppVersion: '1.0.0',
            description: description || '',
          },
          null,
          2
        );
        await appOctokit.rest.repos.createOrUpdateFileContents({
          owner: orgName,
          repo: repoName,
          path: 'addon.manifest.json',
          message: 'Add addon manifest template',
          content: Buffer.from(manifestTemplate + '\n').toString('base64'),
        });
      } catch (error) {
        fastify.log.warn({ error }, 'Failed to create manifest template');
      }

      // Cache the repo ID for future scoped-token lookups
      repoIdCache.set(data.full_name, data.id);

      return {
        id: data.id,
        url: data.html_url,
        fullName: data.full_name,
      };
    } catch (error) {
      fastify.log.error({ error }, 'Failed to create GitHub repository');
      return null;
    }
  }

  async function configureRepoProtection(repoFullName: string): Promise<boolean> {
    const octokit = await getOctokitForRepo(repoFullName);
    if (!octokit) return false;

    try {
      const [owner, repo] = repoFullName.split('/');

      await octokit.rest.repos.updateBranchProtection({
        owner,
        repo,
        branch: 'main',
        required_status_checks: null,
        enforce_admins: true,
        required_pull_request_reviews: {
          required_approving_review_count: 1,
          dismiss_stale_reviews: true,
        },
        restrictions: null,
      });

      return true;
    } catch (error) {
      fastify.log.error({ error }, 'Failed to configure branch protection');
      return false;
    }
  }

  async function addCollaborator(
    repoFullName: string,
    githubUsername: string,
    permission: string = 'push'
  ): Promise<boolean> {
    const octokit = await getOctokitForRepo(repoFullName);
    if (!octokit) return false;

    try {
      const [owner, repo] = repoFullName.split('/');

      await octokit.rest.repos.addCollaborator({
        owner,
        repo,
        username: githubUsername,
        permission: permission as 'pull' | 'push' | 'admin' | 'maintain' | 'triage',
      });

      return true;
    } catch (error) {
      fastify.log.error({ error, githubUsername }, 'Failed to add collaborator');
      return false;
    }
  }

  async function removeCollaborator(
    repoFullName: string,
    githubUsername: string
  ): Promise<boolean> {
    const octokit = await getOctokitForRepo(repoFullName);
    if (!octokit) return false;

    try {
      const [owner, repo] = repoFullName.split('/');

      await octokit.rest.repos.removeCollaborator({
        owner,
        repo,
        username: githubUsername,
      });

      return true;
    } catch (error) {
      fastify.log.error({ error, githubUsername }, 'Failed to remove collaborator');
      return false;
    }
  }

  async function syncOrgCollaborators(
    repoFullName: string,
    members: Array<{ githubUsername: string; role: string }>
  ): Promise<void> {
    if (!appOctokit) return;

    const roleToPermission: Record<string, string> = {
      OWNER: 'admin',
      ADMIN: 'maintain',
      MEMBER: 'push',
    };

    for (const member of members) {
      if (!member.githubUsername) continue;

      const permission = roleToPermission[member.role] || 'push';
      await addCollaborator(repoFullName, member.githubUsername, permission);
    }
  }

  async function createPullRequest(
    repoFullName: string,
    head: string,
    base: string,
    title: string,
    body: string
  ): Promise<{ number: number; url: string } | null> {
    const octokit = await getOctokitForRepo(repoFullName);
    if (!octokit) return null;

    try {
      const [owner, repo] = repoFullName.split('/');

      const { data } = await octokit.rest.pulls.create({
        owner,
        repo,
        head,
        base,
        title,
        body,
      });

      return {
        number: data.number,
        url: data.html_url,
      };
    } catch (error) {
      fastify.log.error({ error }, 'Failed to create pull request');
      return null;
    }
  }

  async function setRepoPrivate(repoFullName: string): Promise<boolean> {
    const octokit = await getOctokitForRepo(repoFullName);
    if (!octokit) return false;

    try {
      const [owner, repo] = repoFullName.split('/');

      await octokit.rest.repos.update({
        owner,
        repo,
        private: true,
      });

      return true;
    } catch (error) {
      fastify.log.error({ error }, 'Failed to set repository private');
      return false;
    }
  }

  async function getPrStatus(
    repoFullName: string,
    prNumber: number
  ): Promise<{
    state: string;
    mergeable: boolean | null;
    reviews: Array<{ user: string; state: string; submittedAt?: string }>;
    checks: Array<{ name: string; status: string; conclusion: string | null }>;
  } | null> {
    const octokit = await getOctokitForRepo(repoFullName);
    if (!octokit) return null;

    try {
      const [owner, repo] = repoFullName.split('/');

      const { data: pr } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });

      const { data: reviews } = await octokit.rest.pulls.listReviews({
        owner,
        repo,
        pull_number: prNumber,
      });

      let checks: Array<{ name: string; status: string; conclusion: string | null }> = [];
      if (pr.head.sha) {
        try {
          const { data: checkRuns } = await octokit.rest.checks.listForRef({
            owner,
            repo,
            ref: pr.head.sha,
          });
          checks = checkRuns.check_runs.map((c) => ({
            name: c.name,
            status: c.status,
            conclusion: c.conclusion,
          }));
        } catch {
          // Check runs may not be available
        }
      }

      return {
        state: pr.state,
        mergeable: pr.mergeable,
        reviews: reviews.map((r) => ({
          user: r.user?.login || 'unknown',
          state: r.state,
          submittedAt: r.submitted_at || undefined,
        })),
        checks,
      };
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get PR status');
      return null;
    }
  }

  async function listCollaborators(
    repoFullName: string
  ): Promise<Array<{ login: string; permissions: Record<string, boolean> }> | null> {
    const octokit = await getOctokitForRepo(repoFullName);
    if (!octokit) return null;

    try {
      const [owner, repo] = repoFullName.split('/');

      const { data } = await octokit.rest.repos.listCollaborators({
        owner,
        repo,
        affiliation: 'direct',
      });

      return data.map((c) => ({
        login: c.login,
        permissions: (c.permissions || {}) as Record<string, boolean>,
      }));
    } catch (error) {
      fastify.log.error({ error, repoFullName }, 'Failed to list collaborators');
      return null;
    }
  }

  async function getRateLimitRemaining(): Promise<number | null> {
    if (!appOctokit) return null;

    try {
      const { data } = await appOctokit.rest.rateLimit.get();
      return data.rate.remaining;
    } catch {
      return null;
    }
  }

  function getOAuthUrl(state: string): string {
    if (!isOAuthConfigured) {
      throw new Error('GitHub OAuth is not configured');
    }

    const params = new URLSearchParams({
      client_id: config.GITHUB_OAUTH_CLIENT_ID!,
      redirect_uri: config.GITHUB_OAUTH_CALLBACK_URL!,
      scope: 'read:user user:email',
      state,
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async function exchangeCodeForToken(code: string): Promise<string> {
    if (!isOAuthConfigured) {
      throw new Error('GitHub OAuth is not configured');
    }

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: config.GITHUB_OAUTH_CLIENT_ID,
        client_secret: config.GITHUB_OAUTH_CLIENT_SECRET,
        code,
      }),
    });

    const data = await response.json() as { access_token?: string; error?: string };

    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error}`);
    }

    return data.access_token!;
  }

  async function getUserInfo(accessToken: string) {
    const octokit = new Octokit({ auth: accessToken });

    const { data: user } = await octokit.rest.users.getAuthenticated();

    let email = user.email;
    if (!email) {
      const { data: emails } = await octokit.rest.users.listEmailsForAuthenticatedUser();
      const primaryEmail = emails.find((e) => e.primary);
      email = primaryEmail?.email || null;
    }

    return {
      id: user.id,
      login: user.login,
      name: user.name,
      email,
      avatar_url: user.avatar_url,
    };
  }

  const githubClient: GitHubAppClient = {
    isConfigured,
    getInstallationOctokit,
    createAddonRepo,
    configureRepoProtection,
    addCollaborator,
    removeCollaborator,
    listCollaborators,
    getRateLimitRemaining,
    syncOrgCollaborators,
    createPullRequest,
    setRepoPrivate,
    getPrStatus,
    getOAuthUrl,
    exchangeCodeForToken,
    getUserInfo,
  };

  fastify.decorate('github', githubClient);
}

export const githubAppPlugin = fp(githubAppPluginCallback, {
  name: 'github-app',
});

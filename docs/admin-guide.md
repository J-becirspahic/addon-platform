# Addon Platform - Admin Guide

## GitHub App Setup

### Creating the GitHub App

1. Go to your GitHub organization's **Settings** > **Developer settings** > **GitHub Apps** > **New GitHub App**
2. Configure the following:

| Setting | Value |
|---------|-------|
| **App name** | Addon Platform |
| **Homepage URL** | Your platform URL |
| **Webhook URL** | `https://your-api-domain/api/webhooks/github` |
| **Webhook secret** | Generate a strong secret |

3. **Permissions** required:
   - **Repository**: Administration (Read & write), Contents (Read & write), Pull requests (Read & write), Checks (Read)
   - **Organization**: Members (Read)

4. **Subscribe to events**: Push, Pull request, Pull request review, Repository, Member

5. After creation, note the **App ID** and generate a **Private Key** (.pem file)

6. Install the app on your GitHub organization and note the **Installation ID**

### Environment Variables

Set these in your `.env` file:

```env
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_APP_WEBHOOK_SECRET=your-webhook-secret
GITHUB_APP_CLIENT_ID=Iv1.abc123
GITHUB_APP_CLIENT_SECRET=secret123
GITHUB_APP_INSTALLATION_ID=98765

GITHUB_ORG_NAME=your-org-name
REVIEW_TEAM_SLUG=reviewers
```

---

## Organization Configuration

### Review Team

1. Create a team in your GitHub org (e.g., `reviewers`)
2. Add reviewers to this team
3. Set `REVIEW_TEAM_SLUG=reviewers` in your environment
4. The platform automatically creates `CODEOWNERS` files in new repos pointing to this team

### CODEOWNERS

Each addon repository gets a `CODEOWNERS` file:

```
* @your-org/reviewers
```

This ensures all PRs require approval from the review team.

### Dependency Allow-List

If using a dependency allow-list in your build pipeline, maintain it in the builder service configuration. Addon manifests declare their dependencies, and the build step validates them.

---

## Build Monitoring

### Viewing Builds

1. Navigate to **Admin** > **Builds** (`/admin/builds`)
2. Filter by status: BUILDING, PUBLISHED, FAILED
3. Each entry shows addon name, version, status, start time, and duration

### Investigating Failures

1. Find the failed build in the admin builds list
2. Click through to the version detail page
3. The **Build Report** section shows:
   - Error messages
   - Failed step
   - Timestamps
   - Full build logs (if available)

### Common Build Failures

| Error | Cause | Fix |
|-------|-------|-----|
| `Missing addon.manifest.json` | Manifest not in repo root | Add manifest to repository root |
| `Invalid manifest` | Schema validation failed | Check manifest against schema |
| `Build timed out` | Build exceeded time limit | Optimize build, reduce dependencies |
| `Dependency not allowed` | Unlisted dependency used | Add to allow-list or remove dependency |

---

## Access Reconciliation

The platform automatically reconciles GitHub repository access with organization membership.

### How It Works

Every hour (configurable via `RECONCILIATION_CRON`), the system:

1. Iterates through all organizations and their addon repos
2. Lists actual GitHub collaborators on each repo
3. Compares against expected collaborators (org members with linked GitHub accounts)
4. Removes unexpected collaborators
5. Adds missing collaborators with appropriate permissions
6. Logs all corrections to the audit log

### Permission Mapping

| Org Role | GitHub Permission |
|----------|-------------------|
| Owner | `admin` |
| Admin | `maintain` |
| Member | `push` |

### Manual Trigger

Admins can trigger immediate reconciliation:

```bash
curl -X POST https://your-api/api/admin/reconcile \
  -H "Cookie: access_token=..."
```

Response:

```json
{
  "orgsChecked": 5,
  "reposChecked": 12,
  "driftsFound": 2,
  "corrections": [
    { "repoFullName": "org/addon-acme-widget", "action": "removed", "username": "external-user" },
    { "repoFullName": "org/addon-acme-widget", "action": "added", "username": "new-member" }
  ]
}
```

### Configuration

```env
# Cron expression for reconciliation schedule (default: hourly)
RECONCILIATION_CRON=0 * * * *
```

---

## Audit Log

All platform actions are logged with:

- **userId**: The acting user (or `system` for automated actions)
- **action**: The action type (e.g., `addon.created`, `version.submitted`, `access.reconciliation`)
- **entityType**: The type of entity affected
- **entityId**: The specific entity ID
- **organizationId**: The organization context
- **metadata**: Additional context (JSON)

### Key Audit Actions

| Action | Trigger |
|--------|---------|
| `organization.created` | New org created |
| `member.invited` | Member invited to org |
| `addon.created` | New addon created |
| `version.submitted` | Version PR created |
| `version.approved` | PR review approved |
| `build.started` | Build pipeline triggered |
| `build.completed` | Build succeeded |
| `build.failed` | Build failed |
| `repo.forced_private` | Public repo forced back to private |
| `access.reconciliation` | Reconciliation corrected access drift |

---

## Security

### Webhook Verification

All GitHub webhooks are verified using HMAC-SHA256 signature validation. Additionally:

- **Replay protection**: Duplicate delivery IDs are rejected (1-hour dedup window)
- **Rate limiting**: Webhooks are exempt from rate limits; API endpoints are limited to 100 req/min per IP
- **Auth endpoints**: Login/register limited to 10 req/min per IP

### Repository Security

- All addon repos are created as **private**
- If a repo is made public, the platform automatically forces it back to private
- A security notification is sent to all org members
- The event is logged with `severity: critical`

### Security Headers

The API includes security headers via Helmet:
- HSTS (1 year, includeSubDomains)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff

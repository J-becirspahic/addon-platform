## Test Plan — Addon Management Platform

### Prerequisites

```bash
# 1. Start infrastructure
docker-compose up -d db minio registry

# 2. Install dependencies
pnpm install

# 3. Setup database
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 4. Start ngrok (for GitHub webhooks)
ngrok http 3001

# 5. Start all services (in separate terminals or together)
pnpm dev
```

Verify all three services are running:
- Web: http://localhost:3000
- API: http://localhost:3001/health
- Builder: http://localhost:3002

---

### Test 1 — Authentication

| # | Step | Expected Result |
|---|------|-----------------|
| 1.1 | Go to http://localhost:3000 | Redirected to /login |
| 1.2 | Register a new account with email/password | Account created, redirected to dashboard |
| 1.3 | Log out | Redirected to /login |
| 1.4 | Log in with `admin@addon-platform.dev` / `Admin123!` | Logged in, dashboard shows Acme Corp org |
| 1.5 | Log out, log in with `dev@addon-platform.dev` / `Dev123!` | Dashboard shows Acme Corp and Test Studio |
| 1.6 | Wait 15+ minutes or clear the access token cookie only | App should silently refresh the token without logging you out |

### Test 2 — GitHub Account Linking

| # | Step | Expected Result |
|---|------|-----------------|
| 2.1 | Log in and go to /settings | Settings page shows no GitHub account linked |
| 2.2 | Click "Link GitHub Account" | Redirected to GitHub OAuth consent screen |
| 2.3 | Authorize the app | Redirected back, GitHub username now displayed on settings page |
| 2.4 | Unlink GitHub account | GitHub username removed from settings |
| 2.5 | Re-link GitHub account | GitHub username shown again (needed for later tests) |

### Test 3 — Organization Management

| # | Step | Expected Result |
|---|------|-----------------|
| 3.1 | Click "New Organization" on dashboard | Create org form shown |
| 3.2 | Create org with name "My Test Org" | Org created, redirected to org overview |
| 3.3 | Go to org Settings tab | Name and description editable, slug is read-only |
| 3.4 | Update the description | Saved successfully |
| 3.5 | Go to Members tab | You are listed as OWNER |

### Test 4 — Member Management

| # | Step | Expected Result |
|---|------|-----------------|
| 4.1 | On Members tab, click Invite | Invite modal with email and role fields |
| 4.2 | Invite `dev@addon-platform.dev` as MEMBER | Dev user appears in member list |
| 4.3 | Change dev user's role to ADMIN | Role updated in the list |
| 4.4 | Log in as dev user, navigate to My Test Org | Dev user can see the org |
| 4.5 | Log back in as owner, remove dev user | Dev user removed from list |

### Test 5 — Addon Creation (with GitHub Repo)

| # | Step | Expected Result |
|---|------|-----------------|
| 5.1 | Go to My Test Org > Addons tab > New Addon | Create addon form shown |
| 5.2 | Fill in name "Test Widget", check "Create GitHub repository" | Form accepts input |
| 5.3 | Submit | Addon created, "View Repository" link appears |
| 5.4 | Click the GitHub repo link | Opens GitHub. Repo is private, has addon.manifest.json template |
| 5.5 | Check the repo's branch protection (Settings > Branches on GitHub) | Main branch requires PR with 1 approval (**paid GitHub org plan only** — free orgs do not support branch protection on private repos, skip this step) |
| 5.6 | Check repo collaborators (Settings > Collaborators on GitHub) | Your GitHub account is listed as outside collaborator |

> **Note (free GitHub orgs):** CODEOWNERS may not be created due to a race condition with repo initialization. Branch protection rules require a paid plan (Team/Enterprise) for private repos. These do not affect the core workflow — PRs can still be created, reviewed, and merged manually.

### Test 6 — Version Creation & Submission (Full Workflow)

| # | Step | Expected Result |
|---|------|-----------------|
| 6.1 | On the addon page, click "New Version" | Version creation form |
| 6.2 | Enter version 1.0.0, add a changelog, submit | Version created as DRAFT. Branch `submission/v1.0.0` is auto-created on GitHub. Page shows git instructions |
| 6.3 | Clone the GitHub repo locally | Repo cloned with README and addon.manifest.json (CODEOWNERS may be absent on free plans) |
| 6.4 | Fetch and checkout `submission/v1.0.0`, update addon.manifest.json with version 1.0.0, add an index.js file, push | Push succeeds |
| 6.5 | On the version detail page, click "Submit for Review" | Status changes to SUBMITTED, PR link appears |
| 6.6 | Open the PR on GitHub | PR was created with title "Addon submission: Test Widget v1.0.0". GitHub Actions CI starts automatically |
| 6.7 | Wait for CI to complete on GitHub | Green checkmark appears on the PR (check the Actions tab) |
| 6.8 | On GitHub, approve the PR as a reviewer | Portal status changes to APPROVED. If CI already passed, the PR is auto-merged and status changes to PUBLISHED |
| 6.9 | Check the version detail page | Status is PUBLISHED, PR was auto-merged |

> **Note:** The auto-merge happens when both conditions are met: CI passes AND the PR is approved. The order doesn't matter — if you approve before CI finishes, it will auto-merge once CI passes. If CI passes before approval, it will auto-merge once you approve.

### Test 7 — Changes Requested Flow

| # | Step | Expected Result |
|---|------|-----------------|
| 7.1 | Create version 1.1.0 for the same addon | DRAFT version created, branch `submission/v1.1.0` auto-created |
| 7.2 | Fetch and checkout `submission/v1.1.0`, make changes, push | Version stays DRAFT (push does not auto-submit) |
| 7.3 | On the version detail page, click "Submit for Review" | Status changes to SUBMITTED, PR created, CI starts |
| 7.4 | On GitHub, request changes on the PR | Portal status changes to CHANGES_REQUESTED |
| 7.5 | Push additional commits to the same branch | CI re-runs on the PR |
| 7.6 | Approve the PR after fixes | Once CI passes + approval, PR is auto-merged and status changes to PUBLISHED |

### Test 7b — CI Failure Flow

| # | Step | Expected Result |
|---|------|-----------------|
| 7b.1 | Create a version with an invalid addon.manifest.json (e.g., missing entryPoint) | DRAFT version created |
| 7b.2 | Submit for review | PR created, CI starts |
| 7b.3 | Wait for CI to fail | Portal status changes to CHANGES_REQUESTED. CI failure details visible on the PR |
| 7b.4 | Push a fix to the submission branch | CI re-runs automatically |
| 7b.5 | Once CI passes, approve the PR | PR auto-merged, status changes to PUBLISHED |

### Test 8 — Notifications

| # | Step | Expected Result |
|---|------|-----------------|
| 8.1 | After running through Test 6 or 7, check the notification bell in the header | Notification count badge visible |
| 8.2 | Click the notification bell | Notifications listed (version submitted, approved, building, etc.) |
| 8.3 | Mark notifications as read | Badge count decreases |

### Test 9 — Security: Repo Visibility Protection

| # | Step | Expected Result |
|---|------|-----------------|
| 9.1 | On GitHub, go to the addon repo > Settings > Change visibility to Public | Webhook fires |
| 9.2 | Refresh the repo settings page | Repo is forced back to private automatically |
| 9.3 | Check notifications on the portal | Security alert notification received |

### Test 10 — Access Reconciliation

| # | Step | Expected Result |
|---|------|-----------------|
| 10.1 | On GitHub, manually remove a collaborator from an addon repo | Collaborator removed |
| 10.2 | Trigger reconciliation: POST http://localhost:3001/api/admin/reconciliation (as admin) | Returns result with drifts found |
| 10.3 | Check the repo collaborators on GitHub | Missing collaborator re-added automatically |

### Test 11 — Admin Features

| # | Step | Expected Result |
|---|------|-----------------|
| 11.1 | Log in as `admin@addon-platform.dev` | Dashboard shown |
| 11.2 | Navigate to /admin/builds | Build history page with status filters |
| 11.3 | Log in as `dev@addon-platform.dev`, navigate to /admin/builds | Access denied / redirected |

### Test 12 — Audit Log

| # | Step | Expected Result |
|---|------|-----------------|
| 12.1 | Open Prisma Studio: `pnpm db:studio` | Opens at http://localhost:5555 |
| 12.2 | Browse the AuditLog table | Entries for all actions: user login, org creation, addon creation, repo creation, version submissions, PR events, collaborator changes |

---

### Quick Smoke Test (minimum viable)

If you want to verify the core flow quickly, run tests **1.4 > 2.2-2.3 > 3.1-3.2 > 5.1-5.4 > 6.1-6.6**. This covers auth, GitHub linking, org creation, addon with repo, and the auto-PR submission flow.

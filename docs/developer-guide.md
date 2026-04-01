# Addon Platform - Developer Guide

## Getting Started

### Registration

1. Navigate to the platform at your deployment URL
2. Click **Register** and fill in your name, email, and password
3. After registration, you'll be logged in automatically

### Creating an Organization

1. From the dashboard, click **Create Organization**
2. Provide a name, slug (URL identifier, lowercase alphanumeric with hyphens), and optional description
3. You'll be the **Owner** of the new organization

### Linking Your GitHub Account

To submit addons, you need to link your GitHub account:

1. Go to **Settings** (user menu, top-right)
2. Click **Link GitHub Account**
3. Authorize the OAuth app on GitHub
4. Your GitHub username will appear in your profile

---

## Addon Development

### Creating an Addon

1. Navigate to your organization
2. Click **Addons** > **New Addon**
3. Fill in:
   - **Name**: Display name for your addon
   - **Slug**: URL-safe identifier (3+ chars, lowercase, hyphens allowed, no leading/trailing hyphen)
   - **Description**: What your addon does
   - **Type**: `WIDGET`, `CONNECTOR`, or `THEME`
   - **Create GitHub Repository**: Check this to auto-create a repo in the platform's GitHub org

### Repository Structure

When a GitHub repo is created, it includes:

```
addon-{org-slug}-{addon-slug}/
├── CODEOWNERS          # Auto-generated, assigns review team
├── addon.manifest.json # Required: addon metadata
├── src/                # Your addon source code
└── README.md
```

### addon.manifest.json

Every addon must include a manifest file in the repository root:

```json
{
  "name": "My Addon",
  "version": "1.0.0",
  "type": "WIDGET",
  "description": "A brief description of the addon",
  "author": "Your Name",
  "entry": "src/index.ts",
  "permissions": ["read", "write"],
  "dependencies": {
    "lodash": "^4.17.21"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Display name |
| `version` | Yes | Semver version (must match the submitted version) |
| `type` | Yes | `WIDGET`, `CONNECTOR`, or `THEME` |
| `description` | No | Short description |
| `author` | No | Author name |
| `entry` | Yes | Entry point file |
| `permissions` | No | Required permissions |
| `dependencies` | No | NPM dependencies (must be on the allow-list) |

---

## Submitting a Version

### Step 1: Create a Version

1. Navigate to your addon's detail page
2. Click **Create Version**
3. Enter a semver version (e.g., `1.0.0`) and optional changelog
4. The version is created in **DRAFT** status

### Step 2: Push Code

Create a submission branch and push your code:

```bash
git checkout -b submission/v1.0.0
# Make your changes
git add .
git commit -m "Addon submission v1.0.0"
git push origin submission/v1.0.0
```

The branch **must** be named `submission/v{version}` where `{version}` matches the version you created.

### Step 3: Automatic PR Creation

When you push to a `submission/v*` branch, the platform automatically:

1. Detects the push via webhook
2. Creates a Pull Request against `main`
3. Updates the version status to **SUBMITTED**
4. Notifies your organization members

### Step 4: Review Process

The review team (configured via CODEOWNERS) will review your PR:

- **Approved**: Version moves to **APPROVED** status. You can then merge the PR.
- **Changes Requested**: Version moves to **CHANGES_REQUESTED**. Push fixes to the same branch and the PR updates automatically.

### Step 5: Merge and Build

When the PR is merged:

1. Version status changes to **BUILDING**
2. The build pipeline processes your addon in a Docker-isolated environment
3. On success: **PUBLISHED** - your addon is live
4. On failure: **FAILED** - check the build report for details

---

## Version Status Lifecycle

```
DRAFT → SUBMITTED → APPROVED → BUILDING → PUBLISHED
                  ↓                      ↓
           CHANGES_REQUESTED           FAILED
                  ↓
              (push fixes, re-submit)
```

| Status | Description |
|--------|-------------|
| `DRAFT` | Version created, code not yet submitted |
| `SUBMITTED` | PR created, awaiting review |
| `CHANGES_REQUESTED` | Reviewer requested changes |
| `APPROVED` | Review approved, ready to merge |
| `BUILDING` | PR merged, build in progress |
| `PUBLISHED` | Build succeeded, addon version is live |
| `FAILED` | Build failed, check build report |

---

## Real-Time Updates

The version detail page shows live status updates via Server-Sent Events (SSE). You'll see status changes in real-time without refreshing the page.

---

## FAQ

**Q: Can I have multiple versions in progress?**
A: Yes, you can create multiple versions for the same addon. Each has its own submission branch.

**Q: What happens if my build fails?**
A: Check the build report on the version detail page. Fix the issues, create a new version, and re-submit.

**Q: Can I re-submit after changes are requested?**
A: Yes. Push your fixes to the same `submission/v{version}` branch. The existing PR will update automatically.

**Q: How do I add team members?**
A: Go to your organization's **Members** page. Owners and Admins can invite new members by email.

**Q: What are the organization roles?**
A: **Owner** has full control. **Admin** can manage members and addons. **Member** can read and contribute to addons.

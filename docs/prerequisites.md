# Prerequisites

This guide covers everything you need to install and configure before running the Addon Platform.

---

## System Requirements

| Tool             | Minimum Version | Purpose                          |
|------------------|-----------------|----------------------------------|
| Node.js          | >= 20.0.0       | JavaScript runtime               |
| pnpm             | >= 9.0.0        | Package manager (monorepo)       |
| Docker           | >= 24.0         | Container runtime                |
| Docker Compose   | >= 2.20         | Multi-container orchestration    |
| Git              | >= 2.40         | Version control                  |
| ngrok            | latest          | Tunnel for GitHub webhooks       |

---

## 1. Node.js & pnpm

### Node.js

Download and install Node.js 20+ from https://nodejs.org (LTS recommended).

Verify your installation:

```bash
node --version   # Should print v20.x.x or higher
```

### pnpm

The recommended way to install pnpm is via corepack (ships with Node.js):

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

Alternatively, install it standalone:

```bash
# Windows (PowerShell)
iwr https://get.pnpm.io/install.ps1 -useb | iex

# macOS / Linux
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

Verify:

```bash
pnpm --version   # Should print 9.x.x or higher
```

---

## 2. Docker & Docker Compose

The platform uses Docker to run PostgreSQL, MinIO (S3-compatible storage), and Verdaccio (private npm registry).

### Installation

- **Windows / macOS**: Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose).
- **Linux**: Install [Docker Engine](https://docs.docker.com/engine/install/) and the [Compose plugin](https://docs.docker.com/compose/install/linux/).

Verify:

```bash
docker --version           # Should print 24.x or higher
docker compose version     # Should print v2.20 or higher
```

### Infrastructure Services

The `docker-compose.yml` defines the following services:

| Service    | Image                  | Port(s)       | Purpose                        |
|------------|------------------------|---------------|--------------------------------|
| db         | postgres:16-alpine     | 5432          | PostgreSQL database            |
| minio      | minio/minio:latest     | 9000 / 9001   | S3-compatible artifact storage |
| registry   | verdaccio/verdaccio:5  | 4873          | Private npm registry           |

Start them with:

```bash
docker compose up -d db minio registry
```

---

## 3. ngrok

ngrok creates a public tunnel to your local API server so GitHub can deliver webhooks during development.

### Installation

Download ngrok from https://ngrok.com/download and place the executable somewhere on your system.

**Option A** - Add ngrok to your PATH (recommended):

1. Move `ngrok.exe` to a permanent location, e.g. `C:\tools\`.
2. Add the **folder** containing `ngrok.exe` to your system PATH (not the exe itself):
   - Open **Start > Environment Variables > Edit the system environment variables**.
   - Under **System variables**, select **Path** and click **Edit**.
   - Click **New** and add `C:\tools`.
   - Click **OK** to save.
3. Restart your terminal.

**Option B** - Run ngrok directly from its location:

```bash
# If ngrok.exe is on your Desktop:
~/Desktop/ngrok http 3001
```

### Sign up and authenticate

ngrok requires a free account for persistent tunnels:

1. Sign up at https://dashboard.ngrok.com/signup.
2. Copy your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken.
3. Run:

```bash
ngrok config add-authtoken <your-authtoken>
```

### Usage

```bash
ngrok http 3001
```

This prints a public URL (e.g. `https://abcd1234.ngrok-free.app`). Use this URL when configuring the GitHub App webhook URL.

---

## 4. GitHub App

The platform integrates with GitHub for repository management, pull requests, and webhooks. You need to create a GitHub App in your GitHub organization.

### Create the GitHub App

1. Go to your GitHub organization > **Settings** > **Developer settings** > **GitHub Apps** > **New GitHub App**.
2. Fill in:
   - **App name**: `Addon Platform` (or your preferred name)
   - **Homepage URL**: `http://localhost:3000`
   - **Callback URL**: `http://localhost:3001/api/auth/github/callback`
   - **Webhook URL**: Your ngrok URL + `/api/webhooks/github` (e.g. `https://abcd1234.ngrok-free.app/api/webhooks/github`)
   - **Webhook secret**: Generate one with `openssl rand -hex 20`

### Required Permissions

Set these under **Permissions & events**:

| Category     | Permission      | Access       |
|--------------|-----------------|--------------|
| Repository   | Administration  | Read & write |
| Repository   | Contents        | Read & write |
| Repository   | Pull requests   | Read & write |
| Repository   | Checks          | Read         |
| Repository   | Actions         | Read         |
| Account      | Email addresses | Read         |
| Organization | Members         | Read         |

### Subscribe to Events

Check these events:

- Push
- Pull request
- Pull request review
- Check suite
- Repository
- Member

### After Creation

1. Note the **App ID** from the app's settings page.
2. Generate a **Private Key** (.pem file) and save it securely.
3. Note the **Client ID** and generate a **Client Secret**.
4. **Install** the app on your GitHub organization.
5. Note the **Installation ID** from the installation URL (the number at the end of the URL).

### GitHub Organization Setup

1. Create a team called `reviewers` (or your preferred name) in your organization.
2. Add team members who will review addon submissions.
3. Set `REVIEW_TEAM_SLUG` in your `.env` to match the team slug.

---

## 5. Environment Configuration

Copy the example environment file to **both** the root and the API package directory:

```bash
cp .env.example .env
cp .env.example packages/api/.env
```

Both files must contain the same values. The root `.env` is used by other packages, and `packages/api/.env` is loaded by tsx (the API dev server) and Prisma.

### Generate JWT Secrets

```bash
# Run twice, one for each secret
openssl rand -base64 32
```

Paste the output into `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in your `.env`.

### Required Variables

| Variable                       | Description                                       | Example                          |
|--------------------------------|---------------------------------------------------|----------------------------------|
| `DATABASE_URL`                 | PostgreSQL connection string                      | `postgresql://postgres:postgres@localhost:5432/addon_platform?schema=public` |
| `JWT_ACCESS_SECRET`            | Secret for signing access tokens                  | _(generated)_                    |
| `JWT_REFRESH_SECRET`           | Secret for signing refresh tokens                 | _(generated)_                    |
| `GITHUB_APP_ID`                | GitHub App ID                                     | `123456`                         |
| `GITHUB_APP_PRIVATE_KEY`       | GitHub App private key (PEM, newlines as `\n`)    | `"-----BEGIN RSA..."` |
| `GITHUB_APP_WEBHOOK_SECRET`    | Webhook signature secret                          | _(generated)_                    |
| `GITHUB_APP_CLIENT_ID`         | GitHub App OAuth Client ID                        | `Iv1.abc123`                     |
| `GITHUB_APP_CLIENT_SECRET`     | GitHub App OAuth Client Secret                    | _(from GitHub)_                  |
| `GITHUB_APP_INSTALLATION_ID`   | Installation ID on your org                       | `78901234`                       |
| `GITHUB_ORG_NAME`              | GitHub organization name                          | `my-org`                         |
| `GITHUB_OAUTH_CLIENT_ID`       | Same as `GITHUB_APP_CLIENT_ID`                    | `Iv1.abc123`                     |
| `GITHUB_OAUTH_CLIENT_SECRET`   | Same as `GITHUB_APP_CLIENT_SECRET`                | _(from GitHub)_                  |
| `BUILD_CALLBACK_SECRET`        | Secret for builder callback auth                  | _(generated)_                    |

All other variables in `.env.example` have sensible defaults for local development.

---

## 6. Database Setup

With Docker running and your `.env` configured:

```bash
# Install project dependencies
pnpm install

# Generate the Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Seed with sample data (admin and dev users, sample orgs)
pnpm db:seed
```

### Seed Accounts

After seeding, the following test accounts are available:

| Email                         | Password    | Role  |
|-------------------------------|-------------|-------|
| `admin@addon-platform.dev`    | `Admin123!` | Admin |
| `dev@addon-platform.dev`      | `Dev123!`   | User  |

### Useful Database Commands

```bash
pnpm db:studio     # Open Prisma Studio at http://localhost:5555
pnpm db:push       # Push schema changes without creating a migration
```

---

## 7. Start the Platform

```bash
# 1. Start infrastructure
docker compose up -d db minio registry

# 2. Start ngrok (in a separate terminal)
ngrok http 3001

# 3. Start all services
pnpm dev
```

### Verify Everything Is Running

| Service        | URL                          |
|----------------|------------------------------|
| Web UI         | http://localhost:3000         |
| API            | http://localhost:3001/health  |
| MinIO Console  | http://localhost:9001         |
| Prisma Studio  | http://localhost:5555 (via `pnpm db:studio`) |

> **Note:** Addon builds run via GitHub Actions CI, not a local builder service. When you create an addon with a GitHub repo, the repo includes a `.github/workflows/addon-build.yml` workflow that handles validation, security scanning, and packaging automatically on every PR.

---

## Troubleshooting

### Port conflicts

If a port is already in use, stop the conflicting process or change the port in your `.env` and `docker-compose.yml`.

### Database connection refused

Make sure the PostgreSQL container is running and healthy:

```bash
docker compose ps
docker compose logs db
```

### Prisma migration drift

If you see a "drift detected" error, reset the dev database:

```bash
pnpm --filter api exec prisma migrate reset
```

This drops and recreates the database, then re-applies all migrations and seeds.

### ngrok not recognized

Either add ngrok to your PATH (see section 3) or run it using its full path:

```bash
~/Desktop/ngrok.exe http 3001
```

### Shared package changes not visible

After modifying `packages/shared`, rebuild it:

```bash
pnpm --filter shared build
```

# Addon Platform - API Reference

Base URL: `http://localhost:3001` (development) or your production API URL.

## Authentication

The API uses JWT-based authentication with httpOnly cookies.

### Auth Flow

1. **Register** (`POST /api/auth/register`) or **Login** (`POST /api/auth/login`)
2. Server sets `access_token` and `refresh_token` cookies
3. Include `credentials: 'include'` in all fetch requests
4. Access token expires in 15 minutes; use **Refresh** (`POST /api/auth/refresh`) to renew
5. **Logout** (`POST /api/auth/logout`) clears cookies

### GitHub OAuth Flow

1. Redirect user to `GET /api/auth/github?action=login` (or `action=link` to link an account)
2. User authorizes on GitHub
3. Callback redirects to frontend with auth cookies set

---

## Error Format

All errors follow this structure:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description",
  "details": {}
}
```

| Code | Status | Description |
|------|--------|-------------|
| `BAD_REQUEST` | 400 | Invalid input |
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate resource (e.g., unique constraint) |
| `VALIDATION_ERROR` | 422 | Schema validation failed |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Endpoints

### Health

#### `GET /health`

Liveness check.

**Response** `200`
```json
{ "status": "ok", "timestamp": "2025-01-01T00:00:00.000Z" }
```

#### `GET /health/ready`

Readiness check (database, GitHub connectivity).

**Response** `200` or `503`
```json
{
  "status": "ok",
  "checks": { "db": "ok", "github": "ok" },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

### Auth

#### `POST /api/auth/register`

Rate limit: 10 req/min.

**Request**
```json
{ "email": "user@example.com", "password": "SecurePass123!", "name": "John Doe" }
```

**Response** `201`
```json
{ "user": { "id": "...", "email": "...", "name": "...", "isAdmin": false } }
```

#### `POST /api/auth/login`

Rate limit: 10 req/min.

**Request**
```json
{ "email": "user@example.com", "password": "SecurePass123!" }
```

**Response** `200`
```json
{ "user": { "id": "...", "email": "...", "name": "..." } }
```

#### `POST /api/auth/refresh`

Refreshes the access token using the refresh token cookie.

**Response** `200`
```json
{ "user": { "id": "...", "email": "...", "name": "..." } }
```

#### `POST /api/auth/logout`

Clears authentication cookies.

**Response** `200`
```json
{ "success": true }
```

#### `GET /api/auth/me`

Auth required. Returns the current user.

**Response** `200`
```json
{ "user": { "id": "...", "email": "...", "name": "...", "isAdmin": false, "githubUsername": "..." } }
```

#### `GET /api/auth/github`

Initiates GitHub OAuth. Query params: `action` (`login` | `link`), `returnUrl`.

**Response** `302` Redirect to GitHub.

#### `GET /api/auth/github/callback`

GitHub OAuth callback. Handled automatically.

#### `DELETE /api/auth/github`

Auth required. Unlinks GitHub account.

**Response** `200`
```json
{ "user": { "id": "...", "githubUsername": null } }
```

---

### Organizations

All routes require authentication.

#### `POST /api/organizations`

**Request**
```json
{ "name": "Acme Corp", "slug": "acme", "description": "Optional description" }
```

Slug: 3-50 chars, lowercase alphanumeric with hyphens, no leading/trailing hyphen.

**Response** `201` — Organization object

#### `GET /api/organizations`

Lists organizations the current user is a member of.

**Response** `200`
```json
{ "organizations": [{ "id": "...", "name": "...", "slug": "...", "role": "OWNER" }] }
```

#### `GET /api/organizations/:orgId`

**Response** `200` — Organization with member count and user's role

#### `PATCH /api/organizations/:orgId`

**Request**
```json
{ "name": "New Name", "description": "Updated description" }
```

**Response** `200` — Updated organization

#### `GET /api/organizations/:orgId/members`

**Response** `200`
```json
{ "members": [{ "id": "...", "userId": "...", "role": "OWNER", "user": { "name": "..." } }] }
```

#### `POST /api/organizations/:orgId/members`

Invite a member.

**Request**
```json
{ "email": "member@example.com", "role": "MEMBER" }
```

Role: `ADMIN` or `MEMBER`.

**Response** `201` — Member object

#### `PATCH /api/organizations/:orgId/members/:memberId`

Update member role. Requires OWNER or ADMIN permissions.

**Request**
```json
{ "role": "ADMIN" }
```

**Response** `200` — Updated member

#### `DELETE /api/organizations/:orgId/members/:memberId`

Remove a member.

**Response** `200`

---

### Addons

All routes require authentication and org membership.

#### `POST /api/organizations/:orgId/addons`

**Request**
```json
{
  "name": "My Widget",
  "slug": "my-widget",
  "description": "A cool widget",
  "type": "WIDGET",
  "createGithubRepo": true
}
```

Type: `WIDGET`, `CONNECTOR`, or `THEME`. Slug: 3-50 chars.

**Response** `201` — Addon object (includes `githubRepoUrl` if repo was created)

#### `GET /api/organizations/:orgId/addons`

**Response** `200`
```json
{ "addons": [{ "id": "...", "name": "...", "slug": "...", "status": "ACTIVE", "type": "WIDGET" }] }
```

#### `GET /api/organizations/:orgId/addons/:addonId`

**Response** `200` — Addon with versions and GitHub info

#### `PATCH /api/organizations/:orgId/addons/:addonId`

**Request**
```json
{ "name": "Updated Name", "status": "ACTIVE" }
```

Status: `DRAFT`, `ACTIVE`, `DEPRECATED`, `ARCHIVED`.

**Response** `200` — Updated addon

---

### Versions

All routes require authentication and org membership.

#### `POST /api/organizations/:orgId/addons/:addonId/versions`

**Request**
```json
{ "version": "1.0.0", "changelog": "Initial release" }
```

Version must be valid semver.

**Response** `201` — Version object (status: `DRAFT`)

#### `GET /api/organizations/:orgId/addons/:addonId/versions`

**Response** `200`
```json
{ "versions": [{ "id": "...", "version": "1.0.0", "status": "PUBLISHED" }] }
```

#### `GET /api/organizations/:orgId/addons/:addonId/versions/:versionId`

**Response** `200` — Full version details including build report, PR info

#### `GET /api/organizations/:orgId/addons/:addonId/versions/:versionId/pr-status`

**Response** `200`
```json
{
  "state": "open",
  "mergeable": true,
  "reviews": [{ "user": "reviewer", "state": "APPROVED" }],
  "checks": [{ "name": "build", "status": "completed", "conclusion": "success" }]
}
```

#### `GET /api/organizations/:orgId/addons/:addonId/versions/:versionId/events`

Server-Sent Events stream for real-time version status updates.

**Response** `200` (text/event-stream)
```
data: {"type":"status_change","data":{"versionId":"...","status":"BUILDING"}}
```

---

### Builds

#### `GET /api/organizations/:orgId/addons/:addonId/versions/:versionId/build`

Auth required. Get build report for a version.

**Response** `200` — Build report with steps, artifacts, duration

#### `POST /api/internal/build-callback`

No auth cookie required. Uses `X-Build-Secret` header.

**Request**
```json
{
  "versionId": "...",
  "buildId": "...",
  "status": "success",
  "report": { "steps": [], "duration": 120 },
  "downloadUrl": "https://...",
  "fileSize": 12345,
  "checksum": "sha256:..."
}
```

**Response** `200`

#### `GET /api/admin/builds`

Auth required (admin only).

**Query**: `status` (BUILDING, PUBLISHED, FAILED), `limit` (1-100), `offset`

**Response** `200` — Paginated build list

---

### Notifications

All routes require authentication.

#### `GET /api/notifications`

**Query**: `unread` (boolean), `limit` (1-100, default 20), `offset` (default 0)

**Response** `200`
```json
{ "notifications": [{ "id": "...", "type": "version.submitted", "title": "...", "message": "...", "read": false }] }
```

#### `PATCH /api/notifications/:notificationId/read`

Mark a notification as read.

**Response** `200`

#### `POST /api/notifications/read-all`

Mark all notifications as read.

**Response** `200`

---

### Webhooks

#### `POST /api/webhooks/github`

Receives GitHub webhooks. Verified via `X-Hub-Signature-256` header. Rate limit exempt.

**Headers**: `X-GitHub-Event`, `X-Hub-Signature-256`, `X-GitHub-Delivery`

**Response** `200`
```json
{ "received": true, "processed": true, "message": "..." }
```

---

### Admin

All routes require authentication and admin privileges.

#### `POST /api/admin/reconcile`

Triggers immediate access reconciliation.

**Response** `200`
```json
{
  "orgsChecked": 5,
  "reposChecked": 12,
  "driftsFound": 2,
  "corrections": [
    { "repoFullName": "org/repo", "action": "removed", "username": "user" }
  ]
}
```

---

## Rate Limits

| Scope | Limit |
|-------|-------|
| Global (per IP) | 100 requests/minute |
| Auth (login/register) | 10 requests/minute |
| Webhooks | Exempt |
| Build callbacks | Exempt |

When rate limited, the API returns `429 Too Many Requests` with a `Retry-After` header.

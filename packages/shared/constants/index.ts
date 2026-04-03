export const ORGANIZATION_ROLES = ['OWNER', 'ADMIN', 'MEMBER'] as const;
export type OrganizationRoleType = (typeof ORGANIZATION_ROLES)[number];

export const ADDON_STATUSES = ['DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED'] as const;
export type AddonStatusType = (typeof ADDON_STATUSES)[number];

export const ADDON_TYPES = ['WIDGET', 'CONNECTOR', 'THEME'] as const;
export type AddonTypeType = (typeof ADDON_TYPES)[number];

export const VERSION_STATUSES = ['DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED', 'BUILDING', 'PUBLISHED', 'FAILED'] as const;
export type VersionStatusType = (typeof VERSION_STATUSES)[number];

export const VERSION_STATUS_COLORS: Record<VersionStatusType, string> = {
  DRAFT: 'gray',
  SUBMITTED: 'blue',
  CHANGES_REQUESTED: 'orange',
  APPROVED: 'green',
  BUILDING: 'purple',
  PUBLISHED: 'green',
  FAILED: 'red',
};

export const NOTIFICATION_TYPES = {
  VERSION_SUBMITTED: 'version.submitted',
  VERSION_APPROVED: 'version.approved',
  VERSION_CHANGES_REQUESTED: 'version.changes_requested',
  VERSION_BUILDING: 'version.building',
  VERSION_PUBLISHED: 'version.published',
  VERSION_FAILED: 'version.failed',
  SECURITY_REPO_PUBLICIZED: 'security.repo_publicized',
} as const;

export const ROLE_PERMISSIONS = {
  OWNER: ['read', 'write', 'delete', 'manage_members', 'manage_settings', 'transfer_ownership'],
  ADMIN: ['read', 'write', 'delete', 'manage_members'],
  MEMBER: ['read', 'write'],
} as const;

export const canManageMembers = (role: OrganizationRoleType): boolean => {
  return role === 'OWNER' || role === 'ADMIN';
};

export const canDeleteOrganization = (role: OrganizationRoleType): boolean => {
  return role === 'OWNER';
};

export const canChangeRole = (actorRole: OrganizationRoleType, targetRole: OrganizationRoleType): boolean => {
  if (actorRole === 'OWNER') return true;
  if (actorRole === 'ADMIN' && targetRole === 'MEMBER') return true;
  return false;
};

export const AUDIT_ACTIONS = {
  ORGANIZATION_CREATED: 'organization.created',
  ORGANIZATION_UPDATED: 'organization.updated',
  ORGANIZATION_DELETED: 'organization.deleted',
  MEMBER_INVITED: 'member.invited',
  MEMBER_JOINED: 'member.joined',
  MEMBER_ROLE_CHANGED: 'member.role_changed',
  MEMBER_REMOVED: 'member.removed',
  ADDON_CREATED: 'addon.created',
  ADDON_UPDATED: 'addon.updated',
  ADDON_DELETED: 'addon.deleted',
  VERSION_CREATED: 'version.created',
  VERSION_PUBLISHED: 'version.published',
  GITHUB_REPO_CREATED: 'github.repo_created',
  GITHUB_COLLABORATOR_ADDED: 'github.collaborator_added',
  GITHUB_COLLABORATOR_REMOVED: 'github.collaborator_removed',
  VERSION_SUBMITTED: 'version.submitted',
  VERSION_APPROVED: 'version.approved',
  VERSION_CHANGES_REQUESTED: 'version.changes_requested',
  VERSION_BUILDING: 'version.building',
  BUILD_STARTED: 'build.started',
  BUILD_COMPLETED: 'build.completed',
  BUILD_FAILED: 'build.failed',
  PR_CREATED: 'pr.created',
  PR_MERGED: 'pr.merged',
  PR_CLOSED: 'pr.closed',
  REPO_FORCED_PRIVATE: 'repo.forced_private',
  ACCESS_RECONCILIATION: 'access.reconciliation',
} as const;

export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

export const API_ROUTES = {
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    ME: '/api/auth/me',
    GITHUB: '/api/auth/github',
    GITHUB_CALLBACK: '/api/auth/github/callback',
    GITHUB_UNLINK: '/api/auth/github',
  },
  ORGANIZATIONS: '/api/organizations',
  WEBHOOKS: {
    GITHUB: '/api/webhooks/github',
  },
} as const;

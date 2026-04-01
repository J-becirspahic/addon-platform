import type { User } from './auth';

export type OrganizationRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  user?: Pick<User, 'id' | 'email' | 'name' | 'avatarUrl' | 'githubUsername'>;
  joinedAt: Date;
}

export interface OrganizationWithRole extends Organization {
  role: OrganizationRole;
  memberCount?: number;
  addonCount?: number;
}

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  description?: string;
  avatarUrl?: string;
}

export interface InviteMemberRequest {
  email: string;
  role: OrganizationRole;
}

export interface UpdateMemberRoleRequest {
  role: OrganizationRole;
}

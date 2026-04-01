import type { PrismaClient, Organization, OrganizationMember, OrganizationRole } from '@prisma/client';
import { ConflictError, ForbiddenError, NotFoundError, BadRequestError } from '../../lib/errors.js';
import { canManageMembers, canChangeRole, canDeleteOrganization, AUDIT_ACTIONS } from '@addon-platform/shared';
import type { CreateOrganizationInput, UpdateOrganizationInput, InviteMemberInput } from './organizations.schemas.js';
import type { GitHubAppClient } from '../../plugins/github-app.js';

export class OrganizationsService {
  constructor(
    private prisma: PrismaClient,
    private github: GitHubAppClient
  ) {}

  async createOrganization(
    userId: string,
    input: CreateOrganizationInput
  ): Promise<Organization> {
    const existing = await this.prisma.organization.findUnique({
      where: { slug: input.slug },
    });

    if (existing) {
      throw new ConflictError('An organization with this slug already exists');
    }

    const organization = await this.prisma.organization.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
    });

    await this.createAuditLog(userId, AUDIT_ACTIONS.ORGANIZATION_CREATED, 'organization', organization.id, organization.id, { name: input.name, slug: input.slug });

    return organization;
  }

  async getUserOrganizations(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                members: true,
                addons: true,
              },
            },
          },
        },
      },
    });

    return memberships.map((m) => ({
      ...m.organization,
      role: m.role,
      memberCount: m.organization._count.members,
      addonCount: m.organization._count.addons,
    }));
  }

  async getOrganization(orgId: string, userId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: orgId, userId },
      },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                members: true,
                addons: true,
              },
            },
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundError('Organization', orgId);
    }

    return {
      ...member.organization,
      role: member.role,
      memberCount: member.organization._count.members,
      addonCount: member.organization._count.addons,
    };
  }

  async updateOrganization(
    orgId: string,
    userId: string,
    input: UpdateOrganizationInput
  ): Promise<Organization> {
    const member = await this.getMemberWithRole(orgId, userId);

    if (member.role !== 'OWNER' && member.role !== 'ADMIN') {
      throw new ForbiddenError('Only owners and admins can update organization settings');
    }

    const organization = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
      },
    });

    await this.createAuditLog(userId, AUDIT_ACTIONS.ORGANIZATION_UPDATED, 'organization', organization.id, organization.id, input);

    return organization;
  }

  async getMembers(orgId: string, userId: string) {
    await this.getMemberWithRole(orgId, userId);

    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            githubUsername: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { joinedAt: 'asc' },
      ],
    });

    return members;
  }

  async inviteMember(
    orgId: string,
    userId: string,
    input: InviteMemberInput
  ): Promise<OrganizationMember> {
    const actorMember = await this.getMemberWithRole(orgId, userId);

    if (!canManageMembers(actorMember.role)) {
      throw new ForbiddenError('You do not have permission to invite members');
    }

    const inviteeUser = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!inviteeUser) {
      throw new NotFoundError('User', input.email);
    }

    const existingMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: orgId, userId: inviteeUser.id },
      },
    });

    if (existingMember) {
      throw new ConflictError('User is already a member of this organization');
    }

    const member = await this.prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId: inviteeUser.id,
        role: input.role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            githubUsername: true,
          },
        },
      },
    });

    await this.createAuditLog(userId, AUDIT_ACTIONS.MEMBER_INVITED, 'member', member.id, orgId, {
      inviteeEmail: input.email,
      role: input.role,
    });

    await this.syncMemberToRepos(orgId, inviteeUser.id);

    return member;
  }

  async updateMemberRole(
    orgId: string,
    memberId: string,
    userId: string,
    newRole: OrganizationRole
  ): Promise<OrganizationMember> {
    const actorMember = await this.getMemberWithRole(orgId, userId);
    const targetMember = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!targetMember || targetMember.organizationId !== orgId) {
      throw new NotFoundError('Member', memberId);
    }

    if (!canChangeRole(actorMember.role, newRole)) {
      throw new ForbiddenError('You do not have permission to assign this role');
    }

    if (targetMember.role === 'OWNER' && actorMember.role !== 'OWNER') {
      throw new ForbiddenError('Only owners can change another owner\'s role');
    }

    if (newRole === 'OWNER') {
      const owners = await this.prisma.organizationMember.count({
        where: { organizationId: orgId, role: 'OWNER' },
      });
      if (owners <= 1 && targetMember.role === 'OWNER') {
        throw new BadRequestError('Cannot demote the last owner');
      }
    }

    const updatedMember = await this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: newRole },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            githubUsername: true,
          },
        },
      },
    });

    await this.createAuditLog(userId, AUDIT_ACTIONS.MEMBER_ROLE_CHANGED, 'member', memberId, orgId, {
      previousRole: targetMember.role,
      newRole,
      targetUserId: targetMember.userId,
    });

    await this.syncMemberToRepos(orgId, targetMember.userId);

    return updatedMember;
  }

  async removeMember(
    orgId: string,
    memberId: string,
    userId: string
  ): Promise<void> {
    const actorMember = await this.getMemberWithRole(orgId, userId);
    const targetMember = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!targetMember || targetMember.organizationId !== orgId) {
      throw new NotFoundError('Member', memberId);
    }

    const isSelf = targetMember.userId === userId;

    if (!isSelf && !canManageMembers(actorMember.role)) {
      throw new ForbiddenError('You do not have permission to remove members');
    }

    if (targetMember.role === 'OWNER' && !isSelf) {
      if (actorMember.role !== 'OWNER') {
        throw new ForbiddenError('Only owners can remove other owners');
      }
    }

    if (targetMember.role === 'OWNER') {
      const owners = await this.prisma.organizationMember.count({
        where: { organizationId: orgId, role: 'OWNER' },
      });
      if (owners <= 1) {
        throw new BadRequestError('Cannot remove the last owner');
      }
    }

    await this.prisma.organizationMember.delete({
      where: { id: memberId },
    });

    await this.createAuditLog(userId, AUDIT_ACTIONS.MEMBER_REMOVED, 'member', memberId, orgId, {
      removedUserId: targetMember.userId,
      removedUserEmail: targetMember.user.email,
    });

    await this.removeMemberFromRepos(orgId, targetMember.user.githubUsername);
  }

  private async getMemberWithRole(orgId: string, userId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: orgId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenError('You are not a member of this organization');
    }

    return member;
  }

  private async syncMemberToRepos(orgId: string, userId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      include: { user: true },
    });

    if (!member?.user.githubUsername) return;

    const addons = await this.prisma.addon.findMany({
      where: { organizationId: orgId, githubRepoFullName: { not: null } },
    });

    const roleToPermission: Record<string, string> = {
      OWNER: 'admin',
      ADMIN: 'maintain',
      MEMBER: 'push',
    };

    for (const addon of addons) {
      if (addon.githubRepoFullName) {
        await this.github.addCollaborator(
          addon.githubRepoFullName,
          member.user.githubUsername,
          roleToPermission[member.role]
        );
      }
    }
  }

  private async removeMemberFromRepos(orgId: string, githubUsername: string | null) {
    if (!githubUsername) return;

    const addons = await this.prisma.addon.findMany({
      where: { organizationId: orgId, githubRepoFullName: { not: null } },
    });

    for (const addon of addons) {
      if (addon.githubRepoFullName) {
        await this.github.removeCollaborator(addon.githubRepoFullName, githubUsername);
      }
    }
  }

  private async createAuditLog(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    organizationId: string | null,
    metadata?: Record<string, unknown>
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        organizationId,
        metadata: metadata || {},
      },
    });
  }
}

import bcrypt from 'bcrypt';
import type { PrismaClient, User } from '@prisma/client';
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../../lib/errors.js';
import type { RegisterInput, LoginInput } from './auth.schemas.js';

const SALT_ROUNDS = 12;

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async register(input: RegisterInput): Promise<User> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictError('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
      },
    });

    return user;
  }

  async login(input: LoginInput): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);

    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    return user;
  }

  async getUserById(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    return user;
  }

  async findOrCreateGitHubUser(githubInfo: {
    id: number;
    login: string;
    name: string | null;
    email: string | null;
    avatar_url: string;
  }, accessToken: string): Promise<User> {
    let user = await this.prisma.user.findUnique({
      where: { githubUserId: githubInfo.id },
    });

    if (user) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          githubUsername: githubInfo.login,
          githubAccessToken: accessToken,
          avatarUrl: githubInfo.avatar_url,
          ...(githubInfo.name && { name: githubInfo.name }),
        },
      });
      return user;
    }

    if (githubInfo.email) {
      user = await this.prisma.user.findUnique({
        where: { email: githubInfo.email },
      });

      if (user) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            githubUserId: githubInfo.id,
            githubUsername: githubInfo.login,
            githubAccessToken: accessToken,
            avatarUrl: githubInfo.avatar_url,
          },
        });
        return user;
      }
    }

    if (!githubInfo.email) {
      throw new BadRequestError(
        'No email associated with your GitHub account. Please add a public email to your GitHub profile or register with email/password first.'
      );
    }

    user = await this.prisma.user.create({
      data: {
        email: githubInfo.email,
        name: githubInfo.name || githubInfo.login,
        githubUserId: githubInfo.id,
        githubUsername: githubInfo.login,
        githubAccessToken: accessToken,
        avatarUrl: githubInfo.avatar_url,
      },
    });

    return user;
  }

  async linkGitHubAccount(
    userId: string,
    githubInfo: {
      id: number;
      login: string;
      name: string | null;
      email: string | null;
      avatar_url: string;
    },
    accessToken: string
  ): Promise<User> {
    const existingGitHubUser = await this.prisma.user.findUnique({
      where: { githubUserId: githubInfo.id },
    });

    if (existingGitHubUser && existingGitHubUser.id !== userId) {
      throw new ConflictError('This GitHub account is already linked to another user');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        githubUserId: githubInfo.id,
        githubUsername: githubInfo.login,
        githubAccessToken: accessToken,
        avatarUrl: githubInfo.avatar_url,
      },
    });

    return user;
  }

  async unlinkGitHubAccount(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    if (!user.passwordHash) {
      throw new BadRequestError(
        'Cannot unlink GitHub account without a password. Please set a password first.'
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        githubUserId: null,
        githubUsername: null,
        githubAccessToken: null,
      },
    });

    return updatedUser;
  }

  sanitizeUser(user: User): Omit<User, 'passwordHash' | 'githubAccessToken'> {
    const { passwordHash, githubAccessToken, ...sanitized } = user;
    return sanitized;
  }
}

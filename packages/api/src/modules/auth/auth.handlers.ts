import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service.js';
import { registerSchema, loginSchema, githubCallbackSchema } from './auth.schemas.js';
import { BadRequestError, UnauthorizedError } from '../../lib/errors.js';
import { COOKIE_NAMES } from '@addon-platform/shared';
import { getConfig } from '../../lib/config.js';

export async function registerHandler(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
) {
  const input = registerSchema.parse(request.body);
  const authService = new AuthService(request.server.prisma);

  const user = await authService.register(input);
  const tokens = request.server.generateTokens(user);
  request.server.setAuthCookies(reply, tokens);

  return reply.status(201).send({
    user: authService.sanitizeUser(user),
  });
}

export async function loginHandler(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
) {
  const input = loginSchema.parse(request.body);
  const authService = new AuthService(request.server.prisma);

  const user = await authService.login(input);
  const tokens = request.server.generateTokens(user);
  request.server.setAuthCookies(reply, tokens);

  return reply.send({
    user: authService.sanitizeUser(user),
  });
}

export async function refreshHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const refreshToken = request.cookies[COOKIE_NAMES.REFRESH_TOKEN];

  if (!refreshToken) {
    throw new UnauthorizedError('No refresh token provided');
  }

  const payload = request.server.verifyRefreshToken(refreshToken);
  const authService = new AuthService(request.server.prisma);

  const user = await authService.getUserById(payload.userId);
  const tokens = request.server.generateTokens(user);
  request.server.setAuthCookies(reply, tokens);

  return reply.send({
    user: authService.sanitizeUser(user),
  });
}

export async function logoutHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.server.clearAuthCookies(reply);
  return reply.send({ success: true });
}

export async function meHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.user) {
    throw new UnauthorizedError('Not authenticated');
  }

  const authService = new AuthService(request.server.prisma);
  const user = await authService.getUserById(request.user.userId);

  return reply.send({
    user: authService.sanitizeUser(user),
  });
}

export async function githubRedirectHandler(
  request: FastifyRequest<{ Querystring: { action?: string; returnUrl?: string } }>,
  reply: FastifyReply
) {
  const { action = 'login', returnUrl } = request.query;
  const config = getConfig();

  const state = Buffer.from(
    JSON.stringify({ action, returnUrl, userId: request.user?.userId })
  ).toString('base64');

  const url = request.server.github.getOAuthUrl(state);

  return reply.redirect(url);
}

export async function githubCallbackHandler(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply
) {
  const { code, state } = githubCallbackSchema.parse(request.query);
  const config = getConfig();

  let stateData: { action?: string; returnUrl?: string; userId?: string } = {};
  if (state) {
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    } catch {
      // Invalid state, use defaults
    }
  }

  const accessToken = await request.server.github.exchangeCodeForToken(code);
  const githubUser = await request.server.github.getUserInfo(accessToken);

  const authService = new AuthService(request.server.prisma);
  let user;

  if (stateData.action === 'link' && stateData.userId) {
    user = await authService.linkGitHubAccount(stateData.userId, githubUser, accessToken);
  } else {
    user = await authService.findOrCreateGitHubUser(githubUser, accessToken);
  }

  const tokens = request.server.generateTokens(user);
  request.server.setAuthCookies(reply, tokens);

  const redirectUrl = stateData.returnUrl || config.FRONTEND_URL;
  return reply.redirect(redirectUrl);
}

export async function githubUnlinkHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.user) {
    throw new UnauthorizedError('Not authenticated');
  }

  const authService = new AuthService(request.server.prisma);
  const user = await authService.unlinkGitHubAccount(request.user.userId);

  return reply.send({
    user: authService.sanitizeUser(user),
  });
}

import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { JwtPayload, User } from '@addon-platform/shared';
import { getConfig } from '../lib/config.js';
import { UnauthorizedError } from '../lib/errors.js';
import { COOKIE_NAMES } from '@addon-platform/shared';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
    currentUser?: User;
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    optionalAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    generateTokens: (user: Pick<User, 'id' | 'email' | 'name'>) => { accessToken: string; refreshToken: string };
    setAuthCookies: (reply: FastifyReply, tokens: { accessToken: string; refreshToken: string }) => void;
    clearAuthCookies: (reply: FastifyReply) => void;
    verifyAccessToken: (token: string) => JwtPayload;
    verifyRefreshToken: (token: string) => JwtPayload;
  }
}

function parseExpiresIn(value: string): number {
  const match = value.match(/^(\d+)([smhd])$/);
  if (!match) return 900;

  const num = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return num;
    case 'm':
      return num * 60;
    case 'h':
      return num * 60 * 60;
    case 'd':
      return num * 60 * 60 * 24;
    default:
      return 900;
  }
}

async function authPluginCallback(fastify: FastifyInstance) {
  const config = getConfig();

  function generateTokens(user: Pick<User, 'id' | 'email' | 'name'>) {
    const accessPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      name: user.name,
      type: 'access',
    };

    const refreshPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      name: user.name,
      type: 'refresh',
    };

    const accessToken = jwt.sign(accessPayload, config.JWT_ACCESS_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRES_IN,
    });

    const refreshToken = jwt.sign(refreshPayload, config.JWT_REFRESH_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN,
    });

    return { accessToken, refreshToken };
  }

  function setAuthCookies(
    reply: FastifyReply,
    tokens: { accessToken: string; refreshToken: string }
  ) {
    const accessMaxAge = parseExpiresIn(config.JWT_ACCESS_EXPIRES_IN) * 1000;
    const refreshMaxAge = parseExpiresIn(config.JWT_REFRESH_EXPIRES_IN) * 1000;

    reply.setCookie(COOKIE_NAMES.ACCESS_TOKEN, tokens.accessToken, {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: 'lax',
      path: '/',
      maxAge: accessMaxAge,
      domain: config.COOKIE_DOMAIN,
    });

    reply.setCookie(COOKIE_NAMES.REFRESH_TOKEN, tokens.refreshToken, {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: refreshMaxAge,
      domain: config.COOKIE_DOMAIN,
    });
  }

  function clearAuthCookies(reply: FastifyReply) {
    reply.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, {
      path: '/',
      domain: config.COOKIE_DOMAIN,
    });
    reply.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, {
      path: '/api/auth',
      domain: config.COOKIE_DOMAIN,
    });
  }

  function verifyAccessToken(token: string): JwtPayload {
    try {
      const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtPayload;
      if (payload.type !== 'access') {
        throw new UnauthorizedError('Invalid token type');
      }
      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Access token expired');
      }
      throw new UnauthorizedError('Invalid access token');
    }
  }

  function verifyRefreshToken(token: string): JwtPayload {
    try {
      const payload = jwt.verify(token, config.JWT_REFRESH_SECRET) as JwtPayload;
      if (payload.type !== 'refresh') {
        throw new UnauthorizedError('Invalid token type');
      }
      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Refresh token expired');
      }
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  async function authenticate(request: FastifyRequest, reply: FastifyReply) {
    const token = request.cookies[COOKIE_NAMES.ACCESS_TOKEN];

    if (!token) {
      throw new UnauthorizedError('No access token provided');
    }

    request.user = verifyAccessToken(token);
  }

  async function optionalAuth(request: FastifyRequest, reply: FastifyReply) {
    const token = request.cookies[COOKIE_NAMES.ACCESS_TOKEN];

    if (token) {
      try {
        request.user = verifyAccessToken(token);
      } catch {
        // Token invalid, but that's okay for optional auth
      }
    }
  }

  fastify.decorate('generateTokens', generateTokens);
  fastify.decorate('setAuthCookies', setAuthCookies);
  fastify.decorate('clearAuthCookies', clearAuthCookies);
  fastify.decorate('verifyAccessToken', verifyAccessToken);
  fastify.decorate('verifyRefreshToken', verifyRefreshToken);
  fastify.decorate('authenticate', authenticate);
  fastify.decorate('optionalAuth', optionalAuth);
}

export const authPlugin = fp(authPluginCallback, {
  name: 'auth',
});

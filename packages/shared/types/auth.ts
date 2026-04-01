export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  githubUserId?: number;
  githubUsername?: string;
  githubAccessToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash' | 'githubAccessToken'>;
}

export interface GitHubOAuthState {
  returnUrl?: string;
  action: 'login' | 'link';
}

export interface GitHubUserInfo {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

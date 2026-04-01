import type { User, AuthResponse, LoginRequest, RegisterRequest } from '@addon-platform/shared';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const authState = reactive<AuthState>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
});

export function useAuth() {
  const api = useApi();
  const router = useRouter();

  async function fetchUser() {
    authState.isLoading = true;
    try {
      const { user } = await api.get<AuthResponse>('/api/auth/me');
      authState.user = user as User;
      authState.isAuthenticated = true;
    } catch {
      authState.user = null;
      authState.isAuthenticated = false;
    } finally {
      authState.isLoading = false;
    }
  }

  async function login(credentials: LoginRequest) {
    const { user } = await api.post<AuthResponse>('/api/auth/login', credentials);
    authState.user = user as User;
    authState.isAuthenticated = true;
    return user;
  }

  async function register(data: RegisterRequest) {
    const { user } = await api.post<AuthResponse>('/api/auth/register', data);
    authState.user = user as User;
    authState.isAuthenticated = true;
    return user;
  }

  async function logout() {
    await api.post('/api/auth/logout');
    authState.user = null;
    authState.isAuthenticated = false;
    router.push('/login');
  }

  async function refreshToken() {
    try {
      const { user } = await api.post<AuthResponse>('/api/auth/refresh');
      authState.user = user as User;
      authState.isAuthenticated = true;
      return true;
    } catch {
      authState.user = null;
      authState.isAuthenticated = false;
      return false;
    }
  }

  function loginWithGitHub(returnUrl?: string) {
    const config = useRuntimeConfig();
    const params = new URLSearchParams({ action: 'login' });
    if (returnUrl) {
      params.set('returnUrl', returnUrl);
    }
    window.location.href = `${config.public.apiBaseUrl}/api/auth/github?${params.toString()}`;
  }

  function linkGitHub(returnUrl?: string) {
    const config = useRuntimeConfig();
    const params = new URLSearchParams({ action: 'link' });
    if (returnUrl) {
      params.set('returnUrl', returnUrl);
    }
    window.location.href = `${config.public.apiBaseUrl}/api/auth/github?${params.toString()}`;
  }

  async function unlinkGitHub() {
    const { user } = await api.delete<AuthResponse>('/api/auth/github');
    authState.user = user as User;
    return user;
  }

  return {
    user: computed(() => authState.user),
    isAuthenticated: computed(() => authState.isAuthenticated),
    isLoading: computed(() => authState.isLoading),
    fetchUser,
    login,
    register,
    logout,
    refreshToken,
    loginWithGitHub,
    linkGitHub,
    unlinkGitHub,
  };
}

import type { OrganizationWithRole } from '@addon-platform/shared';

export default defineNuxtRouteMiddleware(async (to) => {
  const { isAuthenticated, isLoading, fetchUser } = useAuth();
  const api = useApi();

  if (isLoading.value) {
    await fetchUser();
  }

  if (!isAuthenticated.value) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    });
  }

  const orgId = to.params.slug as string;
  if (!orgId) {
    return navigateTo('/');
  }

  try {
    const { organization } = await api.get<{ organization: OrganizationWithRole }>(`/api/organizations/${orgId}`);

    if (!organization) {
      return navigateTo('/');
    }
  } catch {
    return navigateTo('/');
  }
});

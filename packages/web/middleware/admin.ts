export default defineNuxtRouteMiddleware(async (to) => {
  const { isAuthenticated, isLoading, fetchUser, user } = useAuth();

  if (isLoading.value) {
    await fetchUser();
  }

  if (!isAuthenticated.value) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    });
  }

  if (!user.value?.isAdmin) {
    return navigateTo('/');
  }
});

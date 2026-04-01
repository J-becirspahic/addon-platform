export default defineNuxtRouteMiddleware(async (to) => {
  const { isAuthenticated, isLoading, fetchUser } = useAuth();

  if (isLoading.value) {
    await fetchUser();
  }

  if (!isAuthenticated.value) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    });
  }
});

<script setup lang="ts">
definePageMeta({
  layout: 'auth',
});

const { login, loginWithGitHub, isAuthenticated } = useAuth();
const route = useRoute();
const router = useRouter();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

const redirectTo = computed(() => {
  const redirect = route.query.redirect as string;
  return redirect || '/';
});

if (isAuthenticated.value) {
  router.push(redirectTo.value);
}

async function handleSubmit() {
  error.value = '';
  loading.value = true;

  try {
    await login({ email: email.value, password: password.value });
    router.push(redirectTo.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Login failed';
  } finally {
    loading.value = false;
  }
}

function handleGitHubLogin() {
  loginWithGitHub(redirectTo.value);
}
</script>

<template>
  <div>
    <h2 class="auth-title">Sign in to your account</h2>

    <div v-if="error" class="alert alert-error">
      {{ error }}
    </div>

    <form @submit.prevent="handleSubmit">
      <FormInput
        v-model="email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        required
      />

      <FormInput
        v-model="password"
        label="Password"
        type="password"
        placeholder="Your password"
        required
      />

      <button
        type="submit"
        class="btn btn-primary btn-full"
        :disabled="loading"
      >
        {{ loading ? 'Signing in...' : 'Sign in' }}
      </button>
    </form>

    <div class="auth-divider">
      <span>or continue with</span>
    </div>

    <button
      type="button"
      class="btn btn-secondary btn-full github-btn"
      @click="handleGitHubLogin"
    >
      Sign in with GitHub
    </button>

    <p class="auth-footer">
      Don't have an account?
      <NuxtLink to="/register">Sign up</NuxtLink>
    </p>
  </div>
</template>

<style scoped>
.auth-title {
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 1.25rem;
}

.btn-full {
  width: 100%;
  margin-top: 0.5rem;
}

.auth-divider {
  display: flex;
  align-items: center;
  margin: 1.5rem 0;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background-color: var(--color-border);
}

.auth-divider span {
  padding: 0 1rem;
}

.github-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.auth-footer {
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}
</style>

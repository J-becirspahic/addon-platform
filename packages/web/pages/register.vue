<script setup lang="ts">
definePageMeta({
  layout: 'auth',
});

const { register, loginWithGitHub, isAuthenticated } = useAuth();
const router = useRouter();

const name = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');
const loading = ref(false);

if (isAuthenticated.value) {
  router.push('/');
}

async function handleSubmit() {
  error.value = '';

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match';
    return;
  }

  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters';
    return;
  }

  loading.value = true;

  try {
    await register({
      name: name.value,
      email: email.value,
      password: password.value,
    });
    router.push('/');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Registration failed';
  } finally {
    loading.value = false;
  }
}

function handleGitHubSignup() {
  loginWithGitHub('/');
}
</script>

<template>
  <div>
    <h2 class="auth-title">Create your account</h2>

    <div v-if="error" class="alert alert-error">
      {{ error }}
    </div>

    <form @submit.prevent="handleSubmit">
      <FormInput
        v-model="name"
        label="Name"
        placeholder="Your name"
        required
      />

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
        placeholder="At least 8 characters"
        required
      />

      <FormInput
        v-model="confirmPassword"
        label="Confirm Password"
        type="password"
        placeholder="Confirm your password"
        required
      />

      <button
        type="submit"
        class="btn btn-primary btn-full"
        :disabled="loading"
      >
        {{ loading ? 'Creating account...' : 'Create account' }}
      </button>
    </form>

    <div class="auth-divider">
      <span>or continue with</span>
    </div>

    <button
      type="button"
      class="btn btn-secondary btn-full"
      @click="handleGitHubSignup"
    >
      Sign up with GitHub
    </button>

    <p class="auth-footer">
      Already have an account?
      <NuxtLink to="/login">Sign in</NuxtLink>
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

.auth-footer {
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}
</style>

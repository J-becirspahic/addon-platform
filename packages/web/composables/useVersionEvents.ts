export function useVersionEvents(orgId: string, addonId: string, versionId: string) {
  const config = useRuntimeConfig();
  const connected = ref(false);
  const latestStatus = ref<string | null>(null);

  let eventSource: EventSource | null = null;

  function connect() {
    const url = `${config.public.apiBaseUrl}/api/organizations/${orgId}/addons/${addonId}/versions/${versionId}/events`;

    eventSource = new EventSource(url, { withCredentials: true });

    eventSource.onopen = () => {
      connected.value = true;
    };

    eventSource.addEventListener('status_change', (event) => {
      try {
        const data = JSON.parse(event.data);
        latestStatus.value = data.status;
      } catch {
        // Ignore parse errors
      }
    });

    eventSource.onerror = () => {
      connected.value = false;
    };
  }

  function disconnect() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
      connected.value = false;
    }
  }

  onMounted(() => {
    connect();
  });

  onUnmounted(() => {
    disconnect();
  });

  return {
    connected: computed(() => connected.value),
    latestStatus: computed(() => latestStatus.value),
  };
}

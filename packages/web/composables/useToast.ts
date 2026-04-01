interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  duration: number;
}

const toasts = ref<Toast[]>([]);
let nextId = 0;

export function useToast() {
  function showToast(message: string, type: Toast['type'] = 'info', duration = 5000) {
    const id = nextId++;
    toasts.value.push({ id, message, type, duration });

    if (duration > 0) {
      setTimeout(() => dismissToast(id), duration);
    }
  }

  function dismissToast(id: number) {
    const index = toasts.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  }

  return {
    toasts: readonly(toasts),
    showToast,
    dismissToast,
  };
}

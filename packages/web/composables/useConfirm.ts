interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
}

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: 'default' | 'danger';
  resolve: ((value: boolean) => void) | null;
}

const state = reactive<ConfirmState>({
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'default',
  resolve: null,
});

export function useConfirm() {
  function confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      state.isOpen = true;
      state.title = options.title;
      state.message = options.message;
      state.confirmText = options.confirmText || 'Confirm';
      state.cancelText = options.cancelText || 'Cancel';
      state.variant = options.variant || 'default';
      state.resolve = resolve;
    });
  }

  function handleConfirm() {
    state.resolve?.(true);
    state.isOpen = false;
    state.resolve = null;
  }

  function handleCancel() {
    state.resolve?.(false);
    state.isOpen = false;
    state.resolve = null;
  }

  return {
    state: readonly(state),
    confirm,
    handleConfirm,
    handleCancel,
  };
}

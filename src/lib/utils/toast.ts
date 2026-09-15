// src/lib/utils/toast.ts
import { toast } from "sonner";

export const showToast = {
  success: (message: string, description?: string) => {
    toast.success(message, {
      description,
      duration: 3000,
    });
  },

  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
      duration: 5000,
    });
  },

  info: (message: string, description?: string) => {
    toast.info(message, {
      description,
      duration: 3000,
    });
  },

  warning: (message: string, description?: string) => {
    toast.warning(message, {
      description,
      duration: 4000,
    });
  },

  loading: (message: string) => {
    return toast.loading(message);
  },

  dismiss: (id?: string | number) => {
    toast.dismiss(id);
  },

  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    },
  ) => {
    return toast.promise(promise, messages);
  },

  // Confirmation dialog (returns promise that resolves to true/false)
  confirm: (
    message: string,
    options?: {
      description?: string;
      confirmText?: string;
      cancelText?: string;
      destructive?: boolean;
    },
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      toast(message, {
        description: options?.description,
        duration: Infinity,
        action: {
          label: options?.confirmText || "Confirm",
          onClick: () => {
            toast.dismiss();
            resolve(true);
          },
        },
        cancel: {
          label: options?.cancelText || "Cancel",
          onClick: () => {
            toast.dismiss();
            resolve(false);
          },
        },
        onDismiss: () => resolve(false),
        onAutoClose: () => resolve(false),
        className: options?.destructive ? "destructive-toast" : "",
      });
    });
  },
};

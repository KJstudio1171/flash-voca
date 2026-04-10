import { createContext, PropsWithChildren, useCallback, useContext, useRef, useState } from "react";

import { ToastContainer } from "@/src/shared/ui/toast/ToastContainer";

type Toast = {
  id: string;
  message: string;
  duration: number;
};

type ToastContextValue = {
  show(message: string, duration?: number): void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_TOASTS = 3;
const DEFAULT_DURATION = 3000;

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, duration = DEFAULT_DURATION) => {
    counterRef.current += 1;
    const id = `toast-${counterRef.current}`;
    setToasts((prev) => {
      const next = [...prev, { id, message, duration }];
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

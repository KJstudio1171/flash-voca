import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

import { useAppServices } from "@/src/app/AppProviders";
import { AuthGateCancelledError } from "@/src/core/errors";

type Resolver = (linked: boolean) => void;

interface AuthGatedActionContextValue {
  ensureLinkedAsync: () => Promise<void>;
  modalVisible: boolean;
  confirm: () => void;
  cancel: () => void;
}

const Ctx = createContext<AuthGatedActionContextValue | null>(null);

export function AuthGatedActionProvider({ children }: PropsWithChildren) {
  const { authService } = useAppServices();
  const [modalVisible, setModalVisible] = useState(false);
  const resolverRef = useRef<Resolver | null>(null);

  const ensureLinkedAsync = useCallback(async () => {
    if (authService.getState().kind === "linked") return;
    setModalVisible(true);
    const linked = await new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
    setModalVisible(false);
    resolverRef.current = null;
    if (!linked) throw new AuthGateCancelledError();
  }, [authService]);

  const confirm = useCallback(async () => {
    try {
      await authService.linkGoogleAsync();
      resolverRef.current?.(true);
    } catch {
      resolverRef.current?.(false);
    }
  }, [authService]);

  const cancel = useCallback(() => {
    resolverRef.current?.(false);
  }, []);

  return (
    <Ctx.Provider value={{ ensureLinkedAsync, modalVisible, confirm, cancel }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuthGatedAction(): AuthGatedActionContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("AuthGatedActionProvider missing");
  return ctx;
}

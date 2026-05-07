import { useEffect, useState } from "react";

import { useAppServices } from "@/src/app/AppServicesContext";
import { AuthState } from "@/src/core/services/auth/AuthService";

export function useAuthState(): AuthState {
  const { authService } = useAppServices();
  const [state, setState] = useState<AuthState>(() => authService.getState());

  useEffect(() => {
    return authService.subscribe(setState);
  }, [authService]);

  return state;
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { createElement } from "react";
import TestRenderer, { act } from "react-test-renderer";

import type { Entitlement, EntitlementStatus } from "@/src/core/domain/models";

// Must be prefixed with "mock" to be allowed in jest.mock factory scope
let mockServices: unknown = null;

jest.mock("@/src/app/AppProviders", () => ({
  useAppServices: () => mockServices,
}));

import { useProAccess, ProAccess } from "@/src/features/billing/hooks/useProAccess";

function makeEntitlement(overrides: Partial<Entitlement> = {}): Entitlement {
  return {
    id: "ent-1",
    userId: "user-1",
    bundleId: "pro",
    provider: "google_play",
    providerRef: "tok-1",
    status: "active" as EntitlementStatus,
    grantedAt: "2026-04-29T00:00:00Z",
    expiresAt: null,
    syncedAt: null,
    kind: "subscription",
    autoRenewing: true,
    ...overrides,
  };
}

type HookProbeProps = {
  onResult: (r: ProAccess) => void;
};

function HookProbe({ onResult }: HookProbeProps) {
  const result = useProAccess();
  onResult(result);
  return null;
}

async function renderProAccessHook(): Promise<{
  getResult: () => ProAccess;
}> {
  let captured: ProAccess = {
    isPro: false,
    expiresAt: null,
    status: null,
    kind: null,
    autoRenewing: false,
  };

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  await act(async () => {
    TestRenderer.create(
      createElement(QueryClientProvider, { client: queryClient },
        createElement(HookProbe, {
          onResult: (r: ProAccess) => {
            captured = r;
          },
        }),
      ),
    );
  });

  return { getResult: () => captured };
}

async function waitFor(fn: () => void, timeout = 2000): Promise<void> {
  const start = Date.now();
  let lastError: unknown;
  while (Date.now() - start < timeout) {
    try {
      await act(async () => {
        await Promise.resolve();
      });
      fn();
      return;
    } catch (e) {
      lastError = e;
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
    }
  }
  throw lastError;
}

describe("useProAccess", () => {
  it("returns isPro=true for active subscription with future expiresAt", async () => {
    mockServices = {
      entitlementService: {
        listActiveEntitlementsAsync: jest.fn().mockResolvedValue([
          makeEntitlement({ expiresAt: "2099-01-01T00:00:00Z" }),
        ]),
      },
    };
    const { getResult } = await renderProAccessHook();
    await waitFor(() => expect(getResult().isPro).toBe(true));
    expect(getResult().kind).toBe("subscription");
  });

  it("returns isPro=true for cancelled subscription before expiry", async () => {
    mockServices = {
      entitlementService: {
        listActiveEntitlementsAsync: jest.fn().mockResolvedValue([
          makeEntitlement({ status: "cancelled", expiresAt: "2099-01-01T00:00:00Z" }),
        ]),
      },
    };
    const { getResult } = await renderProAccessHook();
    await waitFor(() => expect(getResult().isPro).toBe(true));
  });

  it("returns isPro=false for expired status", async () => {
    mockServices = {
      entitlementService: {
        listActiveEntitlementsAsync: jest.fn().mockResolvedValue([
          makeEntitlement({ status: "expired", expiresAt: "2024-01-01T00:00:00Z" }),
        ]),
      },
    };
    const { getResult } = await renderProAccessHook();
    await waitFor(() => expect(getResult().isPro).toBe(false));
  });

  it("returns isPro=false for on_hold status", async () => {
    mockServices = {
      entitlementService: {
        listActiveEntitlementsAsync: jest.fn().mockResolvedValue([
          makeEntitlement({ status: "on_hold", expiresAt: "2099-01-01T00:00:00Z" }),
        ]),
      },
    };
    const { getResult } = await renderProAccessHook();
    await waitFor(() => expect(getResult().isPro).toBe(false));
  });

  it("returns isPro=false when expiresAt is in the past", async () => {
    mockServices = {
      entitlementService: {
        listActiveEntitlementsAsync: jest.fn().mockResolvedValue([
          makeEntitlement({ status: "active", expiresAt: "2024-01-01T00:00:00Z" }),
        ]),
      },
    };
    const { getResult } = await renderProAccessHook();
    await waitFor(() => expect(getResult().isPro).toBe(false));
  });

  it("returns isPro=true and kind=lifetime when expiresAt is null and kind=one_time", async () => {
    mockServices = {
      entitlementService: {
        listActiveEntitlementsAsync: jest.fn().mockResolvedValue([
          makeEntitlement({ status: "active", expiresAt: null, kind: "one_time", autoRenewing: false }),
        ]),
      },
    };
    const { getResult } = await renderProAccessHook();
    await waitFor(() => expect(getResult().isPro).toBe(true));
    expect(getResult().kind).toBe("lifetime");
  });

  it("returns isPro=false when no Pro entitlement exists", async () => {
    mockServices = {
      entitlementService: {
        listActiveEntitlementsAsync: jest.fn().mockResolvedValue([]),
      },
    };
    const { getResult } = await renderProAccessHook();
    await waitFor(() => expect(getResult().isPro).toBe(false));
    expect(getResult().kind).toBeNull();
  });
});

import { createElement } from "react";
import TestRenderer, { act } from "react-test-renderer";

import { useScalePress } from "@/src/shared/animation/useScalePress";

type HookResult = ReturnType<typeof useScalePress>;

function HookProbe({ onResult }: { onResult: (r: HookResult) => void }) {
  onResult(useScalePress());
  return null;
}

function renderHook(): HookResult {
  let captured: HookResult | undefined;
  act(() => {
    TestRenderer.create(
      createElement(HookProbe, {
        onResult: (r: HookResult) => {
          captured = r;
        },
      }),
    );
  });
  if (!captured) throw new Error("hook did not render");
  return captured;
}

describe("useScalePress", () => {
  it("returns animatedStyle and press handlers", () => {
    const result = renderHook();
    expect(result.animatedStyle).toBeDefined();
    expect(typeof result.pressHandlers.onPressIn).toBe("function");
    expect(typeof result.pressHandlers.onPressOut).toBe("function");
  });

  it("invokes handlers without throwing", () => {
    const result = renderHook();
    expect(() => {
      act(() => {
        result.pressHandlers.onPressIn();
      });
      act(() => {
        result.pressHandlers.onPressOut();
      });
    }).not.toThrow();
  });
});

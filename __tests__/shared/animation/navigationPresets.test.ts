import {
  modalPushOptions,
  stackPushOptions,
  tabShiftOptions,
} from "@/src/shared/animation/motionPresets";
import { motion } from "@/src/shared/animation/motionTokens";

describe("navigation presets", () => {
  it("stackPushOptions uses slide_from_right with normal duration", () => {
    expect(stackPushOptions()).toEqual({
      animation: "slide_from_right",
      animationDuration: motion.duration.normal,
    });
  });

  it("modalPushOptions uses slide_from_bottom with normal duration", () => {
    expect(modalPushOptions()).toEqual({
      animation: "slide_from_bottom",
      animationDuration: motion.duration.normal,
    });
  });

  it("tabShiftOptions uses shift with fast duration", () => {
    expect(tabShiftOptions()).toEqual({
      animation: "shift",
      animationDuration: motion.duration.fast,
    });
  });
});

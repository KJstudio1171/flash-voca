import {
  modalPushOptions,
  stackPushOptions,
  tabShiftOptions,
} from "@/src/shared/animation/motionPresets";
import { motion } from "@/src/shared/animation/motionTokens";

describe("navigation presets", () => {
  it("stackPushOptions uses slide_from_right with navigation duration", () => {
    expect(stackPushOptions()).toEqual({
      animation: "slide_from_right",
      animationDuration: motion.duration.navigation,
    });
  });

  it("modalPushOptions uses slide_from_bottom with navigation duration", () => {
    expect(modalPushOptions()).toEqual({
      animation: "slide_from_bottom",
      animationDuration: motion.duration.navigation,
    });
  });

  it("tabShiftOptions uses a short fade transition", () => {
    expect(tabShiftOptions()).toEqual({
      animation: "fade",
      animationDuration: motion.duration.tab,
    });
  });
});

import { motion } from "@/src/shared/animation/motionTokens";

describe("motionTokens", () => {
  it("exposes four duration tokens in ascending order", () => {
    expect(motion.duration.instant).toBe(100);
    expect(motion.duration.fast).toBe(200);
    expect(motion.duration.normal).toBe(350);
    expect(motion.duration.slow).toBe(500);
  });

  it("exposes four easing tokens", () => {
    expect(motion.easing.standard).toBeDefined();
    expect(motion.easing.decelerate).toBeDefined();
    expect(motion.easing.accelerate).toBeDefined();
    expect(motion.easing.playful).toBeDefined();
  });

  it("exposes spring configs with damping/stiffness", () => {
    expect(motion.spring.gentle).toEqual({ damping: 20, stiffness: 180 });
    expect(motion.spring.bouncy).toEqual({ damping: 12, stiffness: 260 });
    expect(motion.spring.snappy).toEqual({ damping: 18, stiffness: 320 });
  });

  it("exposes delay tokens", () => {
    expect(motion.delay.stagger).toBe(50);
    expect(motion.delay.short).toBe(100);
    expect(motion.delay.medium).toBe(200);
  });
});

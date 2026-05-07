import {
  bounceIn,
  cardStackEnter,
  emphasisFadeUp,
  fadeIn,
  fadeInDown,
  fadeInScale,
  fadeInUp,
  screenFade,
  staggeredList,
  studyCardEnter,
} from "@/src/shared/animation/motionPresets";
import { motion } from "@/src/shared/animation/motionTokens";

describe("entering presets", () => {
  it("screenFade returns a defined layout animation", () => {
    expect(screenFade()).toBeDefined();
  });

  it("emphasisFadeUp returns a defined layout animation", () => {
    expect(emphasisFadeUp()).toBeDefined();
  });

  it("fadeIn returns a defined layout animation", () => {
    expect(fadeIn()).toBeDefined();
  });

  it("fadeInUp returns a defined layout animation", () => {
    expect(fadeInUp()).toBeDefined();
  });

  it("fadeInDown returns a defined layout animation", () => {
    expect(fadeInDown()).toBeDefined();
  });

  it("fadeInScale returns a defined layout animation", () => {
    expect(fadeInScale()).toBeDefined();
  });

  it("bounceIn returns a defined layout animation", () => {
    expect(bounceIn()).toBeDefined();
  });

  it("staggeredList returns a defined layout animation for any index", () => {
    expect(staggeredList(0)).toBeDefined();
    expect(staggeredList(5)).toBeDefined();
    expect(staggeredList(50)).toBeDefined();
  });

  it("cardStackEnter returns a defined layout animation", () => {
    expect(cardStackEnter()).toBeDefined();
  });

  it("studyCardEnter returns a defined layout animation", () => {
    expect(studyCardEnter()).toBeDefined();
  });

  it("tokens used in presets match motionTokens", () => {
    expect(motion.delay.stagger).toBe(50);
  });
});

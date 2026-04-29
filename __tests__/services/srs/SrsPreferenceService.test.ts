import { SrsPreferenceService } from "@/src/core/services/srs/SrsPreferenceService";
import { createMockAppMetaStore } from "@/__tests__/helpers/MockAppMetaStore";

describe("SrsPreferenceService", () => {
  it("returns leitner default when key absent", async () => {
    const meta = createMockAppMetaStore();
    const svc = new SrsPreferenceService(meta);
    expect(await svc.getAlgorithmAsync()).toBe("leitner");
  });

  it("persists and reads sm2", async () => {
    const meta = createMockAppMetaStore();
    const svc = new SrsPreferenceService(meta);
    await svc.setAlgorithmAsync("sm2");
    expect(await svc.getAlgorithmAsync()).toBe("sm2");
    expect(meta.setValueAsync).toHaveBeenCalledWith("srs.algorithm", "sm2");
  });

  it("falls back to leitner when stored value is unknown", async () => {
    const meta = createMockAppMetaStore({ "srs.algorithm": "unknown_algo" });
    const svc = new SrsPreferenceService(meta);
    expect(await svc.getAlgorithmAsync()).toBe("leitner");
  });

  it("returns fsrs when stored value is fsrs", async () => {
    const meta = createMockAppMetaStore({ "srs.algorithm": "fsrs" });
    const svc = new SrsPreferenceService(meta);
    expect(await svc.getAlgorithmAsync()).toBe("fsrs");
  });
});

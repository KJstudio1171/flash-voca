import { BreadcrumbBuffer } from "@/src/core/observability/breadcrumbBuffer";
import type { Breadcrumb } from "@/src/core/observability/types";

function makeCrumb(name: string): Breadcrumb {
  return { timestamp: new Date().toISOString(), kind: "event", name };
}

describe("BreadcrumbBuffer", () => {
  it("snapshot returns pushed items in order", () => {
    const buf = new BreadcrumbBuffer(10);
    buf.push(makeCrumb("a"));
    buf.push(makeCrumb("b"));
    expect(buf.snapshot().map((c) => c.name)).toEqual(["a", "b"]);
  });

  it("evicts oldest when exceeding capacity", () => {
    const buf = new BreadcrumbBuffer(2);
    buf.push(makeCrumb("a"));
    buf.push(makeCrumb("b"));
    buf.push(makeCrumb("c"));
    expect(buf.snapshot().map((c) => c.name)).toEqual(["b", "c"]);
  });

  it("snapshot is a copy — mutating it does not affect buffer", () => {
    const buf = new BreadcrumbBuffer(5);
    buf.push(makeCrumb("a"));
    const snap = buf.snapshot();
    snap.pop();
    expect(buf.snapshot().map((c) => c.name)).toEqual(["a"]);
  });

  it("clear empties the buffer", () => {
    const buf = new BreadcrumbBuffer(5);
    buf.push(makeCrumb("a"));
    buf.clear();
    expect(buf.snapshot()).toEqual([]);
  });
});

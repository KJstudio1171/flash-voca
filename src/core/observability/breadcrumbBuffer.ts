import type { Breadcrumb } from "@/src/core/observability/types";

export class BreadcrumbBuffer {
  private readonly items: Breadcrumb[] = [];

  constructor(private readonly capacity: number = 50) {}

  push(crumb: Breadcrumb): void {
    this.items.push(crumb);
    if (this.items.length > this.capacity) this.items.shift();
  }

  snapshot(): Breadcrumb[] {
    return [...this.items];
  }

  clear(): void {
    this.items.length = 0;
  }
}

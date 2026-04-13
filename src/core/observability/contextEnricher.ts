import type { ObservabilityContext } from "@/src/core/observability/types";

export class ContextEnricher {
  constructor(
    private readonly installId: string,
    private readonly appVersion: string,
    private readonly platform: "android" | "ios" | "web",
    private readonly osVersion: string,
    private readonly getLocale: () => string,
    private readonly sessionId: string,
  ) {}

  build(userId?: string): ObservabilityContext {
    return {
      installId: this.installId,
      appVersion: this.appVersion,
      platform: this.platform,
      osVersion: this.osVersion,
      locale: this.getLocale(),
      sessionId: this.sessionId,
      userId,
    };
  }
}

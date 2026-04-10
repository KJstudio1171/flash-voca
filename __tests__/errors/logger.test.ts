import { DeckSaveError } from "@/src/core/errors";
import { logger } from "@/src/core/errors/logger";

describe("logger", () => {
  beforeEach(() => {
    jest.spyOn(console, "debug").mockImplementation();
    jest.spyOn(console, "info").mockImplementation();
    jest.spyOn(console, "warn").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("error", () => {
    it("logs AppError as structured JSON to console.error", () => {
      const appError = new DeckSaveError({ context: { deckId: "deck-1" } });
      logger.error(appError);

      expect(console.error).toHaveBeenCalledTimes(1);
      const logged = JSON.parse((console.error as jest.Mock).mock.calls[0][0]);
      expect(logged.level).toBe("ERROR");
      expect(logged.category).toBe("database");
      expect(logged.message).toBe("DeckSaveError: Deck save failed");
      expect(logged.context).toEqual({ deckId: "deck-1" });
      expect(logged.timestamp).toBe(appError.timestamp);
    });
  });

  describe("debug", () => {
    it("logs to console.debug with app category", () => {
      logger.debug("test message", { key: "value" });

      expect(console.debug).toHaveBeenCalledTimes(1);
      const logged = JSON.parse((console.debug as jest.Mock).mock.calls[0][0]);
      expect(logged.level).toBe("DEBUG");
      expect(logged.category).toBe("app");
      expect(logged.message).toBe("test message");
      expect(logged.context).toEqual({ key: "value" });
    });
  });

  describe("info", () => {
    it("logs to console.info", () => {
      logger.info("info message");

      expect(console.info).toHaveBeenCalledTimes(1);
      const logged = JSON.parse((console.info as jest.Mock).mock.calls[0][0]);
      expect(logged.level).toBe("INFO");
      expect(logged.message).toBe("info message");
    });
  });

  describe("warn", () => {
    it("logs to console.warn", () => {
      logger.warn("warn message");

      expect(console.warn).toHaveBeenCalledTimes(1);
      const logged = JSON.parse((console.warn as jest.Mock).mock.calls[0][0]);
      expect(logged.level).toBe("WARN");
      expect(logged.message).toBe("warn message");
    });
  });

  describe("context omission", () => {
    it("omits context from entry when not provided", () => {
      logger.info("no context");

      const logged = JSON.parse((console.info as jest.Mock).mock.calls[0][0]);
      expect(logged.context).toBeUndefined();
    });
  });
});

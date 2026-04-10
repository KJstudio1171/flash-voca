import {
  AppError,
  DatabaseError,
  DeckSaveError,
  DeckDeleteError,
  DeckNotFoundError,
  StudyRecordError,
  BootstrapError,
  BundleQueryError,
  EntitlementCacheError,
  NetworkError,
  SyncError,
  EntitlementFetchError,
  UnknownError,
} from "@/src/core/errors";

describe("Error class hierarchy", () => {
  describe("DeckSaveError", () => {
    it("is an instance of AppError and DatabaseError", () => {
      const error = new DeckSaveError();
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error).toBeInstanceOf(DeckSaveError);
      expect(error).toBeInstanceOf(Error);
    });

    it("has correct category, userMessage, and name", () => {
      const error = new DeckSaveError();
      expect(error.category).toBe("database");
      expect(error.userMessage).toBe("덱 저장에 실패했습니다.");
      expect(error.name).toBe("DeckSaveError");
      expect(error.message).toBe("Deck save failed");
    });

    it("stores context and timestamp", () => {
      const error = new DeckSaveError({ context: { deckId: "deck-1" } });
      expect(error.context).toEqual({ deckId: "deck-1" });
      expect(error.timestamp).toBeDefined();
      expect(() => new Date(error.timestamp).toISOString()).not.toThrow();
    });

    it("stores cause", () => {
      const cause = new Error("sqlite error");
      const error = new DeckSaveError({ cause });
      expect(error.cause).toBe(cause);
    });
  });

  describe("DeckDeleteError", () => {
    it("has correct properties", () => {
      const error = new DeckDeleteError({ context: { deckId: "d1" } });
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.category).toBe("database");
      expect(error.userMessage).toBe("덱 삭제에 실패했습니다.");
      expect(error.name).toBe("DeckDeleteError");
    });
  });

  describe("DeckNotFoundError", () => {
    it("has correct properties", () => {
      const error = new DeckNotFoundError();
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.userMessage).toBe("덱을 찾을 수 없습니다.");
    });
  });

  describe("StudyRecordError", () => {
    it("has correct properties", () => {
      const error = new StudyRecordError();
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.userMessage).toBe("학습 기록 저장에 실패했습니다.");
    });
  });

  describe("BootstrapError", () => {
    it("has correct properties", () => {
      const error = new BootstrapError();
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.userMessage).toBe("앱 초기화에 실패했습니다.");
    });
  });

  describe("BundleQueryError", () => {
    it("has correct properties", () => {
      const error = new BundleQueryError();
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.userMessage).toBe("번들 정보를 불러올 수 없습니다.");
    });
  });

  describe("EntitlementCacheError", () => {
    it("has correct properties", () => {
      const error = new EntitlementCacheError();
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.userMessage).toBe("구매 캐시 처리에 실패했습니다.");
    });
  });

  describe("SyncError", () => {
    it("is an instance of NetworkError", () => {
      const error = new SyncError();
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.category).toBe("network");
      expect(error.userMessage).toBe("동기화에 실패했습니다.");
    });
  });

  describe("EntitlementFetchError", () => {
    it("has correct properties", () => {
      const error = new EntitlementFetchError();
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.userMessage).toBe("구매 정보를 불러올 수 없습니다.");
    });
  });

  describe("UnknownError", () => {
    it("has correct properties", () => {
      const error = new UnknownError();
      expect(error).toBeInstanceOf(AppError);
      expect(error.category).toBe("unknown");
      expect(error.userMessage).toBe("알 수 없는 오류가 발생했습니다.");
    });

    it("is not an instance of DatabaseError or NetworkError", () => {
      const error = new UnknownError();
      expect(error).not.toBeInstanceOf(DatabaseError);
      expect(error).not.toBeInstanceOf(NetworkError);
    });
  });
});

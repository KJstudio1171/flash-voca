import { rebindUserIdAsync, AffectedTable } from "@/src/core/services/auth/authMigration";

type RunCall = { sql: string; params: unknown[] };

function createMockTx() {
  const calls: RunCall[] = [];
  return {
    calls,
    runAsync: jest.fn(async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
    }),
  };
}

const TABLES: AffectedTable[] = [
  { table: "local_decks", column: "owner_id" },
  { table: "local_user_card_states", column: "user_id" },
  { table: "local_review_logs", column: "user_id" },
  { table: "cached_entitlements", column: "user_id" },
];

describe("rebindUserIdAsync", () => {
  it("issues an UPDATE per table mapping fromUserId to toUserId", async () => {
    const tx = createMockTx();

    await rebindUserIdAsync(tx as unknown as Parameters<typeof rebindUserIdAsync>[0], {
      fromUserId: "local-user",
      toUserId: "uid-123",
      tables: TABLES,
    });

    expect(tx.calls).toHaveLength(TABLES.length);
    for (const [index, table] of TABLES.entries()) {
      expect(tx.calls[index].sql).toContain(`UPDATE ${table.table}`);
      expect(tx.calls[index].sql).toContain(`SET ${table.column} = ?`);
      expect(tx.calls[index].params).toEqual(["uid-123", "local-user"]);
    }
  });

  it("is a no-op when fromUserId equals toUserId", async () => {
    const tx = createMockTx();
    await rebindUserIdAsync(tx as unknown as Parameters<typeof rebindUserIdAsync>[0], {
      fromUserId: "uid-1",
      toUserId: "uid-1",
      tables: TABLES,
    });
    expect(tx.calls).toHaveLength(0);
  });
});

export interface MigrationTransaction {
  runAsync(sql: string, params: unknown[]): Promise<unknown>;
}

export type AffectedTable = { table: string; column: string };

export const USER_ID_TABLES: AffectedTable[] = [
  { table: "local_decks", column: "owner_id" },
  { table: "local_user_card_states", column: "user_id" },
  { table: "local_review_logs", column: "user_id" },
  { table: "cached_entitlements", column: "user_id" },
];

export async function rebindUserIdAsync(
  tx: MigrationTransaction,
  options: {
    fromUserId: string;
    toUserId: string;
    tables?: AffectedTable[];
  },
) {
  if (options.fromUserId === options.toUserId) {
    return;
  }
  const tables = options.tables ?? USER_ID_TABLES;
  for (const { table, column } of tables) {
    await tx.runAsync(
      `UPDATE ${table} SET ${column} = ? WHERE ${column} = ?;`,
      [options.toUserId, options.fromUserId],
    );
  }
}

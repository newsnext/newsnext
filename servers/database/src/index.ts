import type { Database } from "db0"
import type { NewsNextDatabase } from "./d1"
import type * as schema from "./schema"
import { fileURLToPath } from "node:url"
import { createDatabase } from "db0"
import { drizzle as drizzleDb0 } from "db0/integrations/drizzle"
import { DATA_DB_PATH } from "./paths"

export { createD1Db } from "./d1"
export type { NewsNextDatabase } from "./d1"
export * from "./schema"

let databasePromise: Promise<NewsNextDatabase> | undefined

export function getDb(): Promise<NewsNextDatabase> {
  databasePromise ??= createBunDatabase()
  return databasePromise
}

async function createBunDatabase(): Promise<NewsNextDatabase> {
  return createSqliteDb(DATA_DB_PATH)
}

export async function createSqliteDb(path: string): Promise<NewsNextDatabase> {
  const db0 = await createDb0Database(path)
  await prepareSchema(db0)
  return drizzleDb0<typeof schema>(db0) as unknown as NewsNextDatabase
}

async function createDb0Database(path: string): Promise<Database> {
  if (!("Bun" in globalThis)) {
    throw new Error("NewsNext database requires Bun runtime")
  }

  const { default: createBunSqliteConnector } = await import("db0/connectors/bun-sqlite")
  return createDatabase(createBunSqliteConnector({ path: normalizeSqlitePath(path) }))
}

function normalizeSqlitePath(path: string): string {
  return path.startsWith("file:") ? fileURLToPath(path) : path
}

async function prepareSchema(db: Database): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      emailVerified INTEGER DEFAULT false NOT NULL,
      image TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS user_email_unique ON user (email);
  `)

  await db.exec(`
    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY NOT NULL,
      expiresAt INTEGER NOT NULL,
      token TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      ipAddress TEXT,
      userAgent TEXT,
      userId TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES user(id) ON UPDATE no action ON DELETE cascade
    );
    CREATE UNIQUE INDEX IF NOT EXISTS session_token_unique ON session (token);
    CREATE INDEX IF NOT EXISTS session_userId_idx ON session (userId);
  `)

  await db.exec(`
    CREATE TABLE IF NOT EXISTS account (
      id TEXT PRIMARY KEY NOT NULL,
      accountId TEXT NOT NULL,
      providerId TEXT NOT NULL,
      userId TEXT NOT NULL,
      accessToken TEXT,
      refreshToken TEXT,
      idToken TEXT,
      accessTokenExpiresAt INTEGER,
      refreshTokenExpiresAt INTEGER,
      scope TEXT,
      password TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES user(id) ON UPDATE no action ON DELETE cascade
    );
    CREATE INDEX IF NOT EXISTS account_userId_idx ON account (userId);
  `)

  await db.exec(`
    CREATE TABLE IF NOT EXISTS verification (
      id TEXT PRIMARY KEY NOT NULL,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expiresAt INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification (identifier);
  `)

  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_source_instances (
      userId TEXT NOT NULL,
      instanceId TEXT NOT NULL,
      sourceKey TEXT NOT NULL,
      params TEXT NOT NULL,
      isFork INTEGER DEFAULT false NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      PRIMARY KEY(userId, instanceId),
      FOREIGN KEY (userId) REFERENCES user(id) ON UPDATE no action ON DELETE cascade
    );
    CREATE INDEX IF NOT EXISTS user_source_instances_userId_idx ON user_source_instances (userId);
    CREATE INDEX IF NOT EXISTS user_source_instances_sourceKey_idx ON user_source_instances (sourceKey);
  `)

  await db.exec(`
    CREATE TABLE IF NOT EXISTS starred_source_instances (
      userId TEXT NOT NULL,
      instanceId TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      PRIMARY KEY(userId, instanceId),
      FOREIGN KEY (userId) REFERENCES user(id) ON UPDATE no action ON DELETE cascade
    );
    CREATE INDEX IF NOT EXISTS starred_source_instances_userId_idx ON starred_source_instances (userId);
  `)
}

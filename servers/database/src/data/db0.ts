import type { Database } from "db0"
import type * as schema from "./schema"
import { drizzle as drizzleDb0 } from "db0/integrations/drizzle"

export type NewsNextDatabase = ReturnType<typeof drizzleDb0<typeof schema>>

export async function createDbFromDb0(db0: Database): Promise<NewsNextDatabase> {
  await prepareSchema(db0)
  return drizzleDb0<typeof schema>(db0)
}

async function prepareSchema(db: Database): Promise<void> {
  const statements = [
    `
    CREATE TABLE IF NOT EXISTS "user" (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      emailVerified INTEGER DEFAULT false NOT NULL,
      image TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `,
    `CREATE UNIQUE INDEX IF NOT EXISTS user_email_unique ON "user" (email)`,
    `
    CREATE TABLE IF NOT EXISTS "session" (
      id TEXT PRIMARY KEY NOT NULL,
      expiresAt INTEGER NOT NULL,
      token TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      ipAddress TEXT,
      userAgent TEXT,
      userId TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES "user"(id) ON UPDATE no action ON DELETE cascade
    )
  `,
    `CREATE UNIQUE INDEX IF NOT EXISTS session_token_unique ON "session" (token)`,
    `CREATE INDEX IF NOT EXISTS session_userId_idx ON "session" (userId)`,
    `
    CREATE TABLE IF NOT EXISTS "account" (
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
      FOREIGN KEY (userId) REFERENCES "user"(id) ON UPDATE no action ON DELETE cascade
    )
  `,
    `CREATE INDEX IF NOT EXISTS account_userId_idx ON "account" (userId)`,
    `
    CREATE TABLE IF NOT EXISTS "verification" (
      id TEXT PRIMARY KEY NOT NULL,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expiresAt INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `,
    `CREATE INDEX IF NOT EXISTS verification_identifier_idx ON "verification" (identifier)`,
    `
    CREATE TABLE IF NOT EXISTS "user_source_instances" (
      userId TEXT NOT NULL,
      instanceId TEXT NOT NULL,
      sourceKey TEXT NOT NULL,
      params TEXT NOT NULL,
      isFork INTEGER DEFAULT false NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      PRIMARY KEY(userId, instanceId),
      FOREIGN KEY (userId) REFERENCES "user"(id) ON UPDATE no action ON DELETE cascade
    )
  `,
    `CREATE INDEX IF NOT EXISTS user_source_instances_userId_idx ON "user_source_instances" (userId)`,
    `CREATE INDEX IF NOT EXISTS user_source_instances_sourceKey_idx ON "user_source_instances" (sourceKey)`,
    `
    CREATE TABLE IF NOT EXISTS "starred_source_instances" (
      userId TEXT NOT NULL,
      instanceId TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      PRIMARY KEY(userId, instanceId),
      FOREIGN KEY (userId) REFERENCES "user"(id) ON UPDATE no action ON DELETE cascade
    )
  `,
    `CREATE INDEX IF NOT EXISTS starred_source_instances_userId_idx ON "starred_source_instances" (userId)`,
  ]

  for (const statement of statements) {
    await db.prepare(statement).run()
  }
}

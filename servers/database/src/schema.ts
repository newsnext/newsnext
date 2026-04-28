import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

export const user = sqliteTable("user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull(),
  emailVerified: integer({ mode: "boolean" }).notNull().default(false),
  image: text(),
  createdAt: integer({ mode: "timestamp" }).notNull(),
  updatedAt: integer({ mode: "timestamp" }).notNull(),
}, table => [
  uniqueIndex("user_email_unique").on(table.email),
])

export const session = sqliteTable("session", {
  id: text().primaryKey(),
  expiresAt: integer({ mode: "timestamp" }).notNull(),
  token: text().notNull(),
  createdAt: integer({ mode: "timestamp" }).notNull(),
  updatedAt: integer({ mode: "timestamp" }).notNull(),
  ipAddress: text(),
  userAgent: text(),
  userId: text().notNull().references(() => user.id, { onDelete: "cascade" }),
}, table => [
  uniqueIndex("session_token_unique").on(table.token),
  index("session_userId_idx").on(table.userId),
])

export const account = sqliteTable("account", {
  id: text().primaryKey(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  userId: text().notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: integer({ mode: "timestamp" }),
  refreshTokenExpiresAt: integer({ mode: "timestamp" }),
  scope: text(),
  password: text(),
  createdAt: integer({ mode: "timestamp" }).notNull(),
  updatedAt: integer({ mode: "timestamp" }).notNull(),
}, table => [
  index("account_userId_idx").on(table.userId),
])

export const verification = sqliteTable("verification", {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: integer({ mode: "timestamp" }).notNull(),
  createdAt: integer({ mode: "timestamp" }).notNull(),
  updatedAt: integer({ mode: "timestamp" }).notNull(),
}, table => [
  index("verification_identifier_idx").on(table.identifier),
])

export const feeds = sqliteTable("feeds", {
  key: text().primaryKey(),
  provider: text().notNull(),
  feedId: text().notNull(),
  name: text().notNull(),
  title: text(),
  interval: integer().notNull(),
  params: text({ mode: "json" }).$type<Record<string, unknown>>().notNull(),
  color: text().notNull(),
  desc: text(),
  type: text(),
  category: text().notNull(),
  home: text(),
  icon: text(),
  enabled: integer({ mode: "boolean" }).notNull().default(true),
  createdAt: integer().notNull(),
  updatedAt: integer().notNull(),
}, table => [
  uniqueIndex("feeds_provider_feedId_unique").on(table.provider, table.feedId),
  index("feeds_provider_idx").on(table.provider),
  index("feeds_category_idx").on(table.category),
  check("feeds_type_check", sql`${table.type} IS NULL OR ${table.type} IN ('hottest', 'timeline')`),
  check("feeds_category_check", sql`${table.category} IN ('tech', 'finance', 'china', 'world', 'others')`),
])

export const userFeedInstances = sqliteTable("user_feed_instances", {
  userId: text().notNull().references(() => user.id, { onDelete: "cascade" }),
  instanceId: text().notNull(),
  feedKey: text().notNull().references(() => feeds.key, { onDelete: "cascade" }),
  params: text({ mode: "json" }).$type<Record<string, unknown>>().notNull(),
  isFork: integer({ mode: "boolean" }).notNull().default(false),
  createdAt: integer().notNull(),
  updatedAt: integer().notNull(),
}, table => [
  primaryKey({ columns: [table.userId, table.instanceId] }),
  index("user_feed_instances_userId_idx").on(table.userId),
  index("user_feed_instances_feedKey_idx").on(table.feedKey),
])

export const starredFeedInstances = sqliteTable("starred_feed_instances", {
  userId: text().notNull().references(() => user.id, { onDelete: "cascade" }),
  instanceId: text().notNull(),
  createdAt: integer().notNull(),
}, table => [
  primaryKey({ columns: [table.userId, table.instanceId] }),
  index("starred_feed_instances_userId_idx").on(table.userId),
])

export type Feed = typeof feeds.$inferSelect
export type NewFeed = typeof feeds.$inferInsert
export type UserFeedInstance = typeof userFeedInstances.$inferSelect
export type NewUserFeedInstance = typeof userFeedInstances.$inferInsert
export type StarredFeedInstance = typeof starredFeedInstances.$inferSelect
export type NewStarredFeedInstance = typeof starredFeedInstances.$inferInsert

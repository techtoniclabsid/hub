import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

export const ClientSchema = pgTable("clients", {
  id: text()
    .$defaultFn(() => createId())
    .primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  phone: varchar({ length: 255 }),
  email: varchar({ length: 255 }),
  createdAt: timestamp().defaultNow(),
});

export const ClientRelations = relations(ClientSchema, ({ many }) => ({
  posts: many(WebsiteSchema),
}));

export const WebsiteSchema = pgTable("websites", {
  id: text()
    .$defaultFn(() => createId())
    .primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  url: varchar({ length: 255 }).notNull(),
  dealPrice: integer().notNull(),
  annualFee: integer(),
  clientId: text()
    .references(() => ClientSchema.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    })
    .notNull(),
  packageId: text()
    .references(() => PackageSchema.id)
    .notNull(),
  createdAt: timestamp().defaultNow(),
});

export const WebsiteRelations = relations(WebsiteSchema, ({ one, many }) => ({
  client: one(ClientSchema),
  storage: one(StorageSchema),
  package: one(PackageSchema),
  addons: many(WebsiteAddonsSchema),
}));

export const StorageSchema = pgTable("storages", {
  id: text()
    .$defaultFn(() => createId())
    .primaryKey(),
  storage: integer().notNull(),
  remaining: integer().notNull(),
  bucket: text().notNull(),
  websiteId: text()
    .references(() => WebsiteSchema.id, {})
    .notNull(),
});

export const StorageRelations = relations(StorageSchema, ({ one }) => ({
  website: one(WebsiteSchema),
}));

export const PackageSchema = pgTable("packages", {
  id: text()
    .$defaultFn(() => createId())
    .primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  description: text().notNull(),
  startsFrom: integer().notNull(),
});

export const PackageRelations = relations(PackageSchema, ({ many }) => ({
  websites: many(WebsiteAddonsSchema),
}));

export const AddonSchema = pgTable("addons", {
  id: text()
    .$defaultFn(() => createId())
    .primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  description: text().notNull(),
  startsFrom: integer().notNull(),
});

export const AddonRelations = relations(AddonSchema, ({ many }) => ({
  websites: many(WebsiteSchema),
}));

export const WebsiteAddonsSchema = pgTable("websites_to_addons", {
  websiteId: text()
    .notNull()
    .references(() => WebsiteSchema.id),
  addonId: text()
    .notNull()
    .references(() => AddonSchema.id),
});

export const WebsiteAddonsRelation = relations(
  WebsiteAddonsSchema,
  ({ one }) => ({
    addon: one(AddonSchema, {
      fields: [WebsiteAddonsSchema.addonId],
      references: [AddonSchema.id],
    }),
    website: one(WebsiteSchema, {
      fields: [WebsiteAddonsSchema.websiteId],
      references: [WebsiteSchema.id],
    }),
  })
);

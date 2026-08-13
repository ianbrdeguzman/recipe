import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  pgEnum,
  jsonb,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// BETTER AUTH TABLES
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const recipeSourceTypeEnum = pgEnum("recipe_source_type", [
  "manual",
  "url",
]);

export const importedRecipe = pgTable(
  "imported_recipe",
  {
    id: text("id").primaryKey(),
    normalizedSourceUrl: text("normalized_source_url").notNull().unique(),
    originalSourceUrl: text("original_source_url").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    imageKey: text("image_key"),
    servings: integer("servings"),
    prepTimeMinutes: integer("prep_time_minutes"),
    cookTimeMinutes: integer("cook_time_minutes"),
    ingredients: jsonb("ingredients").$type<string[]>().notNull(),
    instructions: jsonb("instructions").$type<string[]>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("imported_recipe_normalized_source_url_idx").on(
      table.normalizedSourceUrl,
    ),
  ],
);

export const recipe = pgTable(
  "recipe",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    importedRecipeId: text("imported_recipe_id").references(
      () => importedRecipe.id,
      {
        onDelete: "set null",
      },
    ),
    normalizedSourceUrl: text("normalized_source_url"),
    sourceType: recipeSourceTypeEnum("source_type").notNull(),
    sourceUrl: text("source_url"),
    title: text("title").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    imageKey: text("image_key"),
    servings: integer("servings"),
    prepTimeMinutes: integer("prep_time_minutes"),
    cookTimeMinutes: integer("cook_time_minutes"),
    ingredients: jsonb("ingredients").$type<string[]>().notNull(),
    instructions: jsonb("instructions").$type<string[]>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("recipe_user_normalized_source_url_unique")
      .on(table.userId, table.normalizedSourceUrl)
      .where(sql`${table.normalizedSourceUrl} is not null`),
  ],
);

export const importedRecipeRelations = relations(
  importedRecipe,
  ({ many }) => ({
    recipes: many(recipe),
  }),
);

export const recipeRelations = relations(recipe, ({ one }) => ({
  user: one(user, {
    fields: [recipe.userId],
    references: [user.id],
  }),
  importedRecipe: one(importedRecipe, {
    fields: [recipe.importedRecipeId],
    references: [importedRecipe.id],
  }),
}));

export const schema = {
  user,
  session,
  account,
  verification,
  recipe,
  importedRecipe,
};

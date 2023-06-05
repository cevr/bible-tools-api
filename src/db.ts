import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { InferModel, eq, sql, and, or } from "drizzle-orm";
import path from "path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

export type Writing = InferModel<typeof writings>;

const writings = sqliteTable("writings", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  order: integer("order").notNull(),
  book: text("book").notNull(),
});

const sqlite = new Database(path.resolve(process.cwd(), "db.sqlite"));
const source = drizzle(sqlite);

migrate(source, {
  migrationsFolder: path.resolve(process.cwd(), "migrations"),
});

export function insertWritings(paragraphs: Writing[]) {
  return source.insert(writings).values(paragraphs).run();
}

function getWritingAndContext(id: string) {
  const main = source.select().from(writings).where(eq(writings.id, id));
  return {
    writing: main.get(),
    context: source
      .select()
      .from(writings)
      .where(
        or(
          and(
            eq(
              writings.book,
              source
                .select({
                  book: writings.book,
                })
                .from(writings)
                .where(eq(writings.id, id))
            ),
            eq(
              writings.order,
              sql`(${source
                .select({
                  order: writings.order,
                })
                .from(writings)
                .where(eq(writings.id, id))} - 1)`
            )
          ),
          and(
            eq(
              writings.book,
              source
                .select({
                  book: writings.book,
                })
                .from(writings)
                .where(eq(writings.id, id))
            ),
            eq(
              writings.order,
              sql`(${source
                .select({
                  order: writings.order,
                })
                .from(writings)
                .where(eq(writings.id, id))} + 1)`
            )
          )
        )
      )
      .all(),
  };
}

export const db = {
  raw: source,
  insertWritings,
  writings,
  getContext: getWritingAndContext,
};

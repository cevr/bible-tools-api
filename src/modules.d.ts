declare module "sqlite-vss" {
  import BetterSqlite3 from "better-sqlite3";
  export function load(db: BetterSqlite3.Database): void;
}

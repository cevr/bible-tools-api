import * as lancedb from "vectordb";
import { DomainError } from "./domain-error";
import { Do, Task } from "ftld";
import { env } from "./env";

const tableName = "writings";

let db: lancedb.Connection;

const connectToDb = () =>
  Task.from(
    async () => {
      if (db) {
        return db;
      }
      const connection = await lancedb.connect(env.LANCEDB_URI);
      db = connection;
      return db;
    },
    (e) => new VectorDbCouldNotConnect({ meta: e })
  );

export type VectorWriting = {
  vector: number[];
  id: string;
};

class VectorDbCouldNotConnect extends DomainError {}
class VectorDbCouldNotGetTable extends DomainError {}
class VectorDbCouldNotInsert extends DomainError {}
class VectorDbCouldNotSearch extends DomainError {}

const insertWritings = (paragraphs: VectorWriting[]) => {
  return Do(function* ($) {
    const db = yield* $(connectToDb());

    const table = yield* $(
      Task.from(
        () => db.openTable(tableName),
        (e) => new VectorDbCouldNotGetTable({ meta: e })
      )
    );
    yield* $(
      Task.from(
        () => table.add(paragraphs),
        (e) => new VectorDbCouldNotInsert({ meta: e })
      )
    );
  });
};

const search = (q: number[], limit = 10) => {
  return Do(function* ($) {
    const db = yield* $(connectToDb());
    const table = yield* $(
      db.openTable(tableName),
      (e) => new VectorDbCouldNotGetTable({ meta: e })
    );
    const results = yield* $(
      table.search(q).limit(limit).execute<VectorWriting>(),
      (e) => new VectorDbCouldNotSearch({ meta: e })
    );
    return results;
  });
};

export const vectorDb = {
  insertWritings,
  search,
};

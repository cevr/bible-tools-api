import * as lancedb from "vectordb";
import { DomainError } from "./domain-error";
import { Do, Task } from "ftld";

const tableName = "writings";

let db: lancedb.Connection;

const connectToDb = () =>
  Task.from(
    async () => {
      if (db) {
        return db;
      }
      const connection = await lancedb.connect("s3://bible-tools-writings");
      db = connection;
      return db;
    },
    (e) => new CouldNotConnectToDbError({ meta: e })
  );

export type VectorWriting = {
  vector: number[];
  id: string;
};

class CouldNotConnectToDbError extends DomainError {}
class CouldNotGetVectorTableError extends DomainError {}
class CouldNotInsertVectorsError extends DomainError {}
class VectorSearchFailedError extends DomainError {}

const insertWritings = (paragraphs: VectorWriting[]) => {
  return Do(function* ($) {
    const db = yield* $(connectToDb());

    const table = yield* $(
      Task.from(
        () => db.openTable(tableName),
        (e) => new CouldNotGetVectorTableError({ meta: e })
      )
    );
    yield* $(
      Task.from(
        () => table.add(paragraphs),
        (e) => new CouldNotInsertVectorsError({ meta: e })
      )
    );
  });
};

const search = (q: number[], limit = 10) => {
  return Do(function* ($) {
    const db = yield* $(connectToDb());
    const table = yield* $(
      db.openTable(tableName),
      (e) => new CouldNotGetVectorTableError({ meta: e })
    );
    const results = yield* $(
      table.search(q).limit(limit).execute<VectorWriting>(),
      (e) => new VectorSearchFailedError({ meta: e })
    );
    return results;
  });
};

export const vectorDb = {
  search,
};

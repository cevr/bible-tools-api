import path from "path";
import * as lancedb from "vectordb";
import { DomainError } from "./domain-error";
import { Do, Task } from "ftld";

const tableName = "writings";

const db = await lancedb.connect("s3://bible-tools-writings");

export type VectorWriting = {
  vector: number[];
  id: string;
};

class CouldNotGetVectorTablesError extends DomainError {}
class CouldNotGetVectorTableError extends DomainError {}
class CouldNotInsertVectorsError extends DomainError {}

export const insertWritings = (paragraphs: VectorWriting[]) => {
  return Do(function* ($) {
    const tables = yield* $(
      Task.from(
        () => db.tableNames(),
        (e) =>
          new CouldNotGetVectorTablesError({
            meta: e,
          })
      )
    );
    if (!tables.includes(tableName)) {
      yield* $(
        Task.from(
          () => db.createTable(tableName, paragraphs),
          (e) => new CouldNotInsertVectorsError({ meta: e })
        )
      );
      return;
    }

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
    const table = yield* $(db.openTable(tableName));
    const results = yield* $(
      table.search(q).limit(limit).execute<VectorWriting>()
    );
    return results;
  });
};

export const vectorDb = {
  insertWritings,
  search,
};

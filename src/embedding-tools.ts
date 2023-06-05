import path from "path";
import * as lancedb from "vectordb";
import streamer from "stream-json/streamers/StreamArray";
import nodeFs from "node:fs";
import { Task, AsyncTask, Do } from "ftld";
import { log } from "./index";
import { DomainError } from "./domain-error";
import { OpenAI } from "./openai";
import { fs, chunkByByteLength, chunk } from "./utils";
import { VectorWriting, insertWritings } from "./vector-db";

type ParsedBookParagraph = {
  content: string;
  refcode_short: string;
  refcode_long: string;
  embedding: number[];
};

class ReadEgwEmbeddingsError extends DomainError {}
class ReadEgwDirectoryError extends DomainError {}
class ReadEgwBookError extends DomainError {}
class ParseEgwBookError extends DomainError {}
class WriteEmbeddedEgwBookError extends DomainError {}
class DeleteFailedEmbeddingsError extends DomainError {}
class FailedDbWriteError extends DomainError {}
class FailedDbGetTableError extends DomainError {}

const skip = Symbol("skip");

// 25 MB
const maxJsonSize = 25 * 1024 * 1024;

// todo: replace all the split embedded files wiht new ones
// just search for any files that have _{number}

function embedIndividualParagraphs() {
  return Do(function* ($) {
    const db = yield* $(
      lancedb.connect(path.resolve(process.cwd(), "dataset"))
    );

    const writingsDir = path.resolve(process.cwd(), "egw_writings");
    const embeddingsDir = path.resolve(process.cwd(), "egw_writings_embedded");

    const writings = yield* $(
      fs
        .readdir(writingsDir)
        .map((files) => files.map((file) => path.resolve(writingsDir, file)))
    );

    const currentEmbeddings = yield* $(fs.readdir(embeddingsDir));
    const writingsToEmbed = writings.filter(
      (writing) =>
        !currentEmbeddings.some((embedding) =>
          embedding.includes(path.basename(writing, ".json"))
        )
    );

    log.info(`Processing ${writingsToEmbed.length} books`);

    let count = 0;
    for (let filename of writingsToEmbed) {
      const code = path.basename(filename, ".json");
      const book: ParsedBookParagraph[] = yield* $(
        fs.readFile(filename, "utf-8").map(JSON.parse)
      );

      log.info(`${code} - Processing ${book.length} paragraphs`);

      let embeddingCount = 0;
      let skipped = 0;
      const embeddings = yield* $(
        Task.parallel(
          book.map((paragraph) =>
            OpenAI.embed(paragraph.content)
              .map((res) => ({
                ...paragraph,
                embedding: res,
              }))
              .tapErr(() => {
                skipped++;
                log.warn(
                  `${code} - Failed to embed paragraph - ${paragraph.refcode_short}`
                );
              })
              .recover(() => Task.Ok(skip))
              .tap(() =>
                log.info(
                  `${code} - Processed ${++embeddingCount}/${
                    book.length
                  } paragraphs`
                )
              )
          ),
          15
        ).map((res) => res.filter((r): r is ParsedBookParagraph => r !== skip))
      );

      const writeChunks = chunkByByteLength(embeddings, maxJsonSize);

      log.info(`${code} - Writing ${writeChunks.length} chunks`);

      yield* $(
        Task.parallel(
          writeChunks.map((chunk, i, chunks) => {
            let newFilename = path.basename(filename, ".json");
            if (chunks.length > 1) {
              newFilename = `${newFilename}_${i}`;
            }
            newFilename = `${newFilename}.json`;
            return fs.writeFile(
              path.resolve(embeddingsDir, newFilename),
              chunk
            );
          })
        )
      );
      log.info(`${code} - processed - ${skipped} paragraphs skipped`);
      log.info(`${++count}/${writingsToEmbed.length} books processed`);
    }
  });
}

function embedChunkedParagraphs() {
  return Do(function* ($) {
    const writingsDir = path.resolve(process.cwd(), "egw_writings");
    const embeddingsDir = path.resolve(process.cwd(), "egw_writings_embedded");

    const writings = yield* $(
      fs
        .readdir(writingsDir)
        .map((files) => files.map((file) => path.resolve(writingsDir, file)))
    );

    const currentEmbeddings = yield* $(fs.readdir(embeddingsDir));
    const writingsToEmbed = writings.filter(
      (writing) =>
        !currentEmbeddings.some((embedding) =>
          embedding.includes(path.basename(writing, ".json"))
        )
    );

    log.info(`Processing ${writingsToEmbed.length} books`);

    let count = 0;
    for (let filename of writingsToEmbed) {
      const code = path.basename(filename, ".json");
      const book: ParsedBookParagraph[] = yield* $(
        fs.readFile(filename, "utf-8").map(JSON.parse)
      );

      const chunkedParagraphs = chunk(
        book.map((p) => p.content),
        500
      );

      log.info(
        `${code} - Processing ${chunkedParagraphs.length} chunks of paragraphs`
      );

      let embeddingCount = 0;
      let skipped = 0;
      const embeddings = yield* $(
        Task.parallel(
          chunkedParagraphs.map((chunk) =>
            OpenAI.embed(chunk).tap(() =>
              log.info(
                `${code} - Processed ${++embeddingCount}/${
                  chunkedParagraphs.length
                } chunks`
              )
            )
          ),
          10
        )
          .map((res) => res.flat())
          .recover(() => Task.Ok(skip))
      );

      if (embeddings === skip) {
        log.warn(`${code} - Failed to embed paragraphs`);
        log.info(`${++count}/${writingsToEmbed.length} books processed`);
        continue;
      }

      const embeddedParagraphs = book.map((paragraph, i) => ({
        ...paragraph,
        embedding: embeddings[i],
      }));

      const writeChunks = chunkByByteLength(embeddedParagraphs, maxJsonSize);

      log.info(`${code} - Writing ${writeChunks.length} chunks`);

      yield* $(
        Task.parallel(
          writeChunks.map((chunk, i, chunks) => {
            let newFilename = path.basename(filename, ".json");
            if (chunks.length > 1) {
              newFilename = `${newFilename}_${i}`;
            }
            newFilename = `${newFilename}.json`;
            return fs.writeFile(
              path.resolve(embeddingsDir, newFilename),
              chunk
            );
          })
        )
      );

      log.info(`${code} - processed - ${skipped} paragraphs skipped`);
      log.info(`${++count}/${writingsToEmbed.length} books processed`);
    }
  });
}

export function addEmbeddingsToDB() {
  return Do(function* ($) {
    const embeddingsDir = path.resolve(process.cwd(), "../cms/embeddings/egw");

    const embeddings = yield* $(
      fs
        .readdir(embeddingsDir)
        .map((files) => files.map((file) => path.resolve(embeddingsDir, file)))
    );

    log.info(`Processing ${embeddings.length} books`);

    let count = 0;

    for (let filename of embeddings) {
      const code = path.basename(filename, ".json");
      log.info(`${code} - Processing`);
      yield* $(
        Task.from(
          () =>
            new Promise<void>((res) => {
              const stream = nodeFs
                .createReadStream(filename)
                .pipe(streamer.withParser());

              let writings: VectorWriting[] = [];
              stream.on("data", ({ value }) => {
                const data: ParsedBookParagraph = value;
                writings.push({
                  vector: data.embedding,
                  id: data.refcode_short,
                });
              });

              stream.on("end", async () => {
                log.info(`${code} - Writing to db`);
                await insertWritings(writings).run();
                log.info(`${code} - wrote ${writings.length} paragraphs to db`);
                writings = [];
                res();
              });
            })
        )
      );
      log.info(`${code} - processed`);
      log.info(`${++count}/${embeddings.length} books processed`);
    }
  });
}

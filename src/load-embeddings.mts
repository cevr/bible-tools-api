import { Github } from "./github-cms.mjs";
import {
  Embedding,
  LabeledEmbedding,
  compareEmbeddingToMultipleSets,
} from "./search-embeddings.mjs";
import { OpenAI } from "./openai.mjs";
import { Result, Task } from "ftld";
import { TaskQueue } from "./task-queue.mjs";

const egwEmbeddingsPath = "embeddings/egw";
const bibleEmbeddingsPath = "embeddings/bible";

const Queue = new TaskQueue();

export function getEgwEmbeddings() {
  return Queue.add("egw", () =>
    Github.getDir<LabeledEmbedding[]>(egwEmbeddingsPath).run()
  );
}

export function getBibleEmbeddings() {
  return Queue.add("bible", () =>
    Github.getDir<
      {
        book: string;
        verse: number;
        chapter: number;
        embedding: Embedding;
        text: string;
      }[]
    >(bibleEmbeddingsPath)
      .map((result) =>
        result.map((verses) =>
          verses.map(
            (verse) =>
              ({
                source: verse.text,
                label: `${verse.book} ${verse.chapter}:${verse.verse}`,
                embedding: verse.embedding,
              } as LabeledEmbedding)
          )
        )
      )
      .run()
  );
}

export function search(query: string) {
  return OpenAI.embed(query).flatMap((embedding) =>
    Task.sequential([getEgwEmbeddings, getBibleEmbeddings]).map((results) => {
      return {
        egw: compareEmbeddingToMultipleSets(embedding, results[0], 0.8, 5),
        bible: compareEmbeddingToMultipleSets(embedding, results[1], 0.8, 5),
      };
    })
  );
}

import {
  Github,
  GithubCouldNotGetDirError,
  GithubCouldNotGetError,
} from "./github-cms.mjs";
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

export const Queue = new TaskQueue();

let egwEmbeddings:
  | Result<
      GithubCouldNotGetError | GithubCouldNotGetDirError,
      LabeledEmbedding[][]
    >
  | undefined;
let bibleEmbeddings:
  | Result<
      GithubCouldNotGetError | GithubCouldNotGetDirError,
      LabeledEmbedding[][]
    >
  | undefined;

export async function getEgwEmbeddings() {
  if (egwEmbeddings) return egwEmbeddings;
  return Queue.add("egw", () =>
    Github.getDir<LabeledEmbedding[]>(egwEmbeddingsPath)
      .tap((res) => {
        if (res.isOk()) {
          egwEmbeddings = res;
        }
      })
      .run()
  );
}

export async function getBibleEmbeddings() {
  if (bibleEmbeddings) return bibleEmbeddings;
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
      .tap((res) => {
        if (res.isOk()) {
          bibleEmbeddings = res;
        }
      })
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

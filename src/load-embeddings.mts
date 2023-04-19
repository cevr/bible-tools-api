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
  return OpenAI.embed(query)
    .flatMap((embedding) =>
      Task.sequential([getEgwEmbeddings, getBibleEmbeddings]).map((results) => {
        return {
          egw: compareEmbeddingToMultipleSets(embedding, results[0], 0.8, 5),
          bible: compareEmbeddingToMultipleSets(embedding, results[1], 0.8, 5),
        };
      })
    )
    .flatMap((results) => {
      return OpenAI.chat([
        {
          role: "system",
          content: settingPrompt,
        },
        {
          role: "system",
          content: relatedBiblicalTextsPrompt(results.bible),
        },
        {
          role: "system",
          content: relatedEGWTextsPrompt(results.egw),
        },
        {
          role: "user",
          content: query,
        },
      ]).map((content) => ({
        ...results,
        answer: content,
      }));
    });
}

const settingPrompt = `You are a helpful assistant to a Seventh Day Adventist bible student. Please help them find the answer to their question.`;
const relatedBiblicalTextsPrompt = (
  relatedTexts: {
    source: string;
    label: string;
  }[]
) =>
  `Here are some related biblical texts that may help you answer the question: ${relatedTexts
    .map((text) => text.source + " (" + text.label + ")")
    .join(", ")}`;

const relatedEGWTextsPrompt = (
  relatedTexts: {
    source: string;
    label: string;
  }[]
) =>
  `Here are some related texts from the author Ellen G. White that may help you answer the question: ${relatedTexts
    .map((text) => text.source + " (" + text.label + ")")
    .join(", ")}`;

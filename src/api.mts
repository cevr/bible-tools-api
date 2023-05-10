import { Result, Task } from "ftld";
import ytdl from "youtube-dl-exec";
import path from "path";
import { promises as fs } from "fs";

import {
  Github,
  GithubCouldNotGetDirError,
  GithubCouldNotGetError,
} from "./github-cms.mjs";

import { OpenAI } from "./openai.mjs";
import { TaskQueue } from "./task-queue.mjs";
import { DomainError } from "./domain-error.js";
import { log } from "./index.mjs";

export type Embedding = number[];
export type LabeledEmbedding = {
  label: string;
  embedding: Embedding;
  source: string;
};

function cosineSimilarity(a: Embedding, b: Embedding): number {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function findSimilarities(
  query: Embedding,
  embeddings: LabeledEmbedding[],
  threshold: number,
  includeContext = true
) {
  const similarities: {
    result: Omit<LabeledEmbedding, "embedding">[];
    score: number;
  }[] = [];

  for (let index = 0; index < embeddings.length; index++) {
    try {
      const similarity = cosineSimilarity(query, embeddings[index].embedding);

      if (similarity >= threshold) {
        similarities.push({
          result: includeContext
            ? withOverlap(embeddings, index, 1).map((e) =>
                omit(e, ["embedding"])
              )
            : [omit(embeddings[index], ["embedding"])],
          score: similarity,
        });
      }
    } catch (error) {
      // Skip this pair of embeddings if they have different lengths
    }
  }

  return similarities;
}

function withOverlap(embeddings: LabeledEmbedding[], index: number, k: number) {
  const start = Math.max(0, index - k);
  const end = Math.min(embeddings.length, index + k);
  return embeddings.slice(start, end);
}

function compareEmbeddingToMultipleSets(
  query: Embedding,
  embeddingSets: LabeledEmbedding[][],
  threshold: number,
  k: number
) {
  return embeddingSets
    .flatMap((embeddingSet) => findSimilarities(query, embeddingSet, threshold))
    .sort((a, b) => (a.score > b.score ? -1 : 1))
    .slice(0, k)
    .flatMap((sim) => sim.result);
}

function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keys.includes(key as K))
  ) as Omit<T, K>;
}

const egwEmbeddingsPath = "embeddings/egw";
const bibleEmbeddingsPath = "embeddings/bible";

const Queue = new TaskQueue();

let egwEmbeddings: LabeledEmbedding[][] | undefined;
let bibleEmbeddings: LabeledEmbedding[][] | undefined;

async function getEgwEmbeddings(): Promise<
  Result<
    GithubCouldNotGetDirError | GithubCouldNotGetError,
    LabeledEmbedding[][]
  >
> {
  if (egwEmbeddings) return Result.Ok(egwEmbeddings);
  return Queue.add("egw", () =>
    Github.getDir<LabeledEmbedding[]>(egwEmbeddingsPath)
      .tap((res) => {
        egwEmbeddings = res;
      })
      .run()
  );
}

function isLoading() {
  return Boolean(Queue.getStatus("egw") || Queue.getStatus("bible"));
}

function preload() {
  Task.sequential([getEgwEmbeddings, getBibleEmbeddings]).run();
}

async function getBibleEmbeddings(): Promise<
  Result<
    GithubCouldNotGetDirError | GithubCouldNotGetError,
    LabeledEmbedding[][]
  >
> {
  if (bibleEmbeddings) return Result.Ok(bibleEmbeddings);
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
        bibleEmbeddings = res;
      })
      .run()
  );
}

function search(query: string) {
  return OpenAI.embed(query).flatMap((embedding) =>
    Task.parallel([getEgwEmbeddings, getBibleEmbeddings]).map((results) => {
      return {
        egw: compareEmbeddingToMultipleSets(embedding, results[0], 0.8, 5),
        bible: compareEmbeddingToMultipleSets(embedding, results[1], 0.8, 5),
      };
    })
  );
}

const YoutubeDownloadJSONFailedError = DomainError.make(
  "YoutubeDownloadJSONFailedError"
);
const YoutubeSaveJSONFailedError = DomainError.make(
  "YoutubeSaveJSONFailedError"
);

type YoutubeDownloadFailedError = DomainError<"YoutubeDownloadFailedError">;
const YoutubeDownloadFailedError = DomainError.make(
  "YoutubeDownloadFailedError"
);

type ReadVideoFailedError = DomainError<"ReadVideoFailedError">;
const ReadVideoFailedError = DomainError.make("ReadVideoFailedError");

type TranscriptionResponse = {
  summary: string;
  transcription: string;
};

function summaryTranscription(url: string) {
  const audioPath = path.resolve(process.cwd(), "tmp", "audio");
  const id = url.split("v=")[1];
  const now = Date.now();
  const filename = path.resolve(audioPath, `${id}-${now}.m4a`);
  return Task.from(
    async () => {
      await ytdl.exec(url, {
        format: "ba",
        output: filename,
      });
    },
    (e) => YoutubeDownloadFailedError({ meta: { url, error: e } })
  )
    .tap(() => log.info(`Downloaded video: ${url}`))
    .flatMap(() =>
      Task.from(
        () => fs.readFile(filename),
        (e) => ReadVideoFailedError({ meta: { filename, error: e } })
      )
    )
    .tap((buffer) => {
      // in MB
      log.info(`Read video: ${filename}, ${buffer.length / 1000000} MB`);
      fs.rm(filename);
    })
    .flatMap(OpenAI.transcribe)
    .tap(() => log.info(`Transcribed video: ${filename}`))
    .flatMap((transcription) =>
      OpenAI.chat([
        OpenAI.chat.makeSystemMessage(transcriptionPrompt),
        OpenAI.chat.makeUserMessage(transcription),
      ]).map(
        (summary) =>
          ({
            transcription,
            summary,
          } as TranscriptionResponse)
      )
    )
    .tap(() => log.info(`provided summary for video: ${filename}`));
}

const transcriptionPrompt = `You are a study helper. You will be given a transcript of audio for an educational video. Your task is to summarize the transcript, provide all the key points, and a study guide for the video.
        Requirements:
        - Provide a summary of the video
        - Provide a list of key points for the video
        - Provide a study guide for the video
        - Provide a list of questions for the video

        Example:
        ---
        Transcript: {{transcript}}


        Response:
        ---
        Summary:
        {{summary}}
        Key Points:
        - {{key_point_1}}
        - {{key_point_2}}
        ...
        Study Guide:
        {{study_guide}}
        Questions:
        - {{question_1}}
        - {{question_2}}
        ...
      `;

export const BibleTools = {
  search,
  summaryTranscription,
  isLoading,
  preload,
};

import { Result, Task } from "ftld";
import ytdl from "youtube-dl-exec";
import path from "path";
import { promises as fs } from "fs";
import { execa } from "execa";

import {
  Github,
  GithubCouldNotGetDirError,
  GithubCouldNotGetError,
} from "./github-cms";

import { OpenAI } from "./openai";
import { TaskQueue } from "./task-queue";
import { DomainError } from "./domain-error";
import { log } from "./index";

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

const ChunkVideoFailedError = DomainError.make("ChunkVideoFailedError");
const ReadChunkDirFailedError = DomainError.make("ReadChunkDirFailedError");
const ReadChunksFailedError = DomainError.make("ReadChunkFailedError");

type YoutubeDownloadFailedError = DomainError<"YoutubeDownloadFailedError">;
const YoutubeDownloadFailedError = DomainError.make(
  "YoutubeDownloadFailedError"
);

type ReadVideoFailedError = DomainError<"ReadVideoFailedError">;
const ReadVideoFailedError = DomainError.make("ReadVideoFailedError");

const ConvertVideoFailedError = DomainError.make("ConvertVideoFailedError");

type TranscriptionResponse = {
  summary: string;
  transcription: string;
};

function summaryTranscription(url: string) {
  const audioPath = path.resolve(process.cwd(), "tmp", "audio");
  const id = url.split("v=")[1];
  const now = Date.now();
  const chunkDir = path.resolve(audioPath, `${id}-${now}`);
  const filename = path.resolve(audioPath, `${id}-${now}.m4a`);
  const mp3Filename = path.resolve(audioPath, `${id}-${now}.mp3`);
  const jsonFilename = path.resolve(audioPath, `${id}-${now}.json`);
  return Task.from(
    () =>
      ytdl(url, {
        format: "ba",
        dumpSingleJson: true,
      }),
    (e) => YoutubeDownloadJSONFailedError({ meta: { url, error: e } })
  )
    .flatMap((json) =>
      Task.from(
        async () => {
          await fs.mkdir(path.dirname(jsonFilename), { recursive: true });
          await fs.writeFile(jsonFilename, JSON.stringify(json));
          return json;
        },
        (e) => YoutubeSaveJSONFailedError({ meta: { url, error: e } })
      )
    )
    .flatMap((json) =>
      Task.from(
        async () => {
          await ytdl.exec("", {
            format: "ba",
            loadInfoJson: jsonFilename,
            output: filename,
          });
          return json;
        },
        (e) => YoutubeDownloadFailedError({ meta: { url, error: e } })
      )
    )
    .tap(() => log.info(`Downloaded video: ${url}`))
    .flatMap((json) =>
      Task.from(
        async () => {
          await execa(path.resolve(process.cwd(), "ffmpeg"), [
            "-i",
            filename,
            "-vn",
            "-c:a",
            "libmp3lame",
            "-q:a",
            "2",
            mp3Filename,
          ]);
          return json;
        },
        (e) => ConvertVideoFailedError({ meta: { url, error: e } })
      )
    )
    .tap(() => log.info(`Converted video to mp3: ${url}`))
    .flatMap((json) =>
      Task.from(
        () => fs.readFile(mp3Filename),
        (e) => ReadVideoFailedError({ meta: { filename, error: e } })
      ).map((buffer) => ({ json, buffer }))
    )
    .flatMap(({ json, buffer }) =>
      Task.from(
        async () => {
          const duration = json.duration;
          const bufferSize = buffer.length;
          const chunkSize = 20 * 1000 * 1000; // 20 MB
          // calculate the number of chunks based on the size and duration
          const numChunks = Math.ceil(bufferSize / chunkSize);
          // calculate the duration of each chunk
          const chunkDuration = Math.ceil(duration / numChunks);
          log.info(`Read video: ${mp3Filename}, ${buffer.length / 1000000} MB`);
          await fs.mkdir(chunkDir, { recursive: true });
          await execa(path.resolve(process.cwd(), "ffmpeg"), [
            "-i",
            mp3Filename,
            "-f",
            "segment",
            "-segment_time",
            `${chunkDuration}`,
            "-c",
            "copy",
            path.resolve(chunkDir, "%03d.mp3"),
          ]);
        },
        (e) => ChunkVideoFailedError({ meta: { filename, error: e } })
      )
    )
    .tap(() => log.info(`Chunked video: ${mp3Filename}`))
    .flatMap(() =>
      Task.from(
        async () => {
          const files = await fs.readdir(chunkDir);
          return files
            .filter((file) => file.endsWith(".mp3"))
            .map((file) => path.resolve(chunkDir, file))
            .sort((a, b) => {
              const aNum = parseInt(a.split(".")[0]);
              const bNum = parseInt(b.split(".")[0]);
              return aNum - bNum;
            });
        },
        (error) => ReadChunkDirFailedError({ meta: { chunkDir, error } })
      )
    )
    .flatMap((files) =>
      Task.parallel(
        files.map((file) =>
          Task.from(
            () => fs.readFile(file),
            () => ReadChunksFailedError({ meta: { file } })
          )
        )
      )
    )
    .tap((files) => log.info(`Read chunks: ${files.length} chunks`))
    .tap(() => {
      fs.rmdir(chunkDir, { recursive: true });
      fs.rm(filename, { force: true });
      fs.rm(jsonFilename, { force: true });
    })
    .tap(() => log.info(`transcribing video`))
    .flatMap((files) =>
      Task.parallel(files.map(OpenAI.transcribe)).map((transcriptions) =>
        transcriptions.join(" ")
      )
    )
    .tap(() => log.info(`Transcribed video: ${filename}`))
    .flatMap((transcription) => {
      const chunks = OpenAI.chunk(transcription);
      if (chunks.length === 1) {
        return OpenAI.chat([
          OpenAI.chat.makeSystemMessage(transcriptionNoChunkPrompt),
          OpenAI.chat.makeUserMessage(transcription),
        ]).map(
          (summary) =>
            ({
              transcription,
              summary,
            } as TranscriptionResponse)
        );
      }
      return Task.parallel(
        OpenAI.chunk(transcription).map((chunked) =>
          OpenAI.chat([
            OpenAI.chat.makeSystemMessage(
              transcriptionChunkPrompt(chunks.length)
            ),
            OpenAI.chat.makeUserMessage(chunked),
          ])
        )
      )
        .flatMap((responses) =>
          OpenAI.chat([
            OpenAI.chat.makeSystemMessage(JoinChunksPrompt),
            OpenAI.chat.makeUserMessage(responses.join("\n")),
          ])
        )
        .map(
          (summary) =>
            ({
              transcription,
              summary,
            } as TranscriptionResponse)
        );
    });
}

const transcriptionNoChunkPrompt = `You are a study helper. You will be given a transcript of audio for an educational video. Your task is to summarize the transcript, provide all the key points, and a study guide for the video.
Be aware that the transcript may contain errors. If you notice any errors, please correct them.

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
...
Study Guide:
{{study_guide}}
Questions:
- {{question_1}}
...`;

const transcriptionChunkPrompt = (
  parts: number
) => `You are a study helper. You will be given a transcript of audio for an educational video. Your task is to summarize the transcript, provide all the key points, and a study guide for the video.
This transcript has been split into ${parts} parts. You will be given a part of the transcript to summarize.

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
...
Study Guide:
{{study_guide}}
Questions:
- {{question_1}}
...

---
Please minimize the output to a language only you can understand and later decode. Please ensure that the output as short as possible.

Requirements:
- The output must be as short as possible
- The output must be in a language only you can understand
- The output must be in a format that can be decoded later
`;

const JoinChunksPrompt = `You are a study helper. You will be given a chunked, minimized, and encoded study guide for an educational video. Your task is to join the chunks together into a single study guide.
Requirements:
- Merge the chunks into a single study guide
- Decode the study guide into a language that can be understood by others
- Ensure that the study guide is coherent and understandable
- Merge all the questions into a single list of questions
- Merge all the key points into a single list of key points
- Merge all the summaries into a single summary

Example:
---
Transcript: {{transcript}}
Response:
---
Summary:
{{summary}}
Key Points:
- {{key_point_1}}
...
Study Guide:
{{study_guide}}
Questions:
- {{question_1}}
...
`;

export const BibleTools = {
  search,
  summaryTranscription,
  isLoading,
  preload,
};

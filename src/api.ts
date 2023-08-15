import { Result, Task, Do } from 'ftld';
import ytdl from 'youtube-dl-exec';
import path from 'path';
import { promises as fs } from 'fs';
import { execa } from 'execa';

import { OpenAI } from './openai';
import { DomainError } from './domain-error';
import { log } from './index';
// import { vectorDb } from "./vector-db";
import type { Writing } from './db';

type SearchResult = {
  writing: Writing;
  context: Writing[];
};

function search(query: string) {
  return Task.from(() => []);
  // return Do(function* ($) {
  //   const embeddedQuery = yield* $(OpenAI.embed(query));
  //   const results = yield* $(vectorDb.search(embeddedQuery));
  //   const data = results.map(
  //     (writing) => db.getWritingAndContext(writing.id) as SearchResult
  //   );
  //   return data;
  // });
}

class YoutubeDownloadJSONFailedError extends DomainError {}
class YoutubeSaveJSONFailedError extends DomainError {}
class YoutubeDownloadFailedError extends DomainError {}
class ChunkVideoFailedError extends DomainError {}
class ReadChunkDirFailedError extends DomainError {}
class ReadChunksFailedError extends DomainError {}
class ReadVideoFailedError extends DomainError {}
class ConvertVideoFailedError extends DomainError {}

type TranscriptionResponse = {
  summary: string;
  transcription: string;
};

function summaryTranscription(url: string) {
  return Do(function* ($) {
    const audioPath = path.resolve(process.cwd(), 'tmp', 'audio');
    const id = url.split('v=')[1];
    const now = Date.now();
    const chunkDir = path.resolve(audioPath, `${id}-${now}`);
    const mp3Filename = path.resolve(audioPath, `${id}-${now}.mp3`);
    const jsonFilename = path.resolve(audioPath, `${id}-${now}.json`);
    log.info(`Downloading video: ${url}`);

    const json = yield* $(
      Task.from(
        () =>
          ytdl(url, {
            audioFormat: 'mp3',
            extractAudio: true,
            printJson: true,
          }),
        (e) => new YoutubeDownloadJSONFailedError({ meta: { url, error: e } }),
      ),
    );

    log.info(`Downloaded video: ${url}`);

    const buffer = yield* $(
      Task.from(
        () => fs.readFile(mp3Filename),
        (e) => new ReadVideoFailedError({ meta: { mp3Filename, error: e } }),
      ),
    );

    yield* $(
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
          await execa(path.resolve(process.cwd(), 'ffmpeg'), [
            '-i',
            mp3Filename,
            '-f',
            'segment',
            '-segment_time',
            `${chunkDuration}`,
            '-c',
            'copy',
            path.resolve(chunkDir, '%03d.mp3'),
          ]);
        },
        (e) => new ChunkVideoFailedError({ meta: { mp3Filename, error: e } }),
      ),
    );
    log.info(`Chunked video: ${mp3Filename}`);

    const files = yield* $(
      Task.from(
        async () => {
          const files = await fs.readdir(chunkDir);
          return files
            .filter((file) => file.endsWith('.mp3'))
            .map((file) => path.resolve(chunkDir, file))
            .sort((a, b) => {
              const aNum = parseInt(a.split('.')[0]);
              const bNum = parseInt(b.split('.')[0]);
              return aNum - bNum;
            });
        },
        (error) => new ReadChunkDirFailedError({ meta: { chunkDir, error } }),
      ),
    );

    const chunks = yield* $(
      Task.parallel(
        files.map((file) =>
          Task.from(
            () => fs.readFile(file),
            () => new ReadChunksFailedError({ meta: { file } }),
          ),
        ),
      ),
    );

    log.info(`Read chunks: ${files.length} chunks`);

    fs.rm(chunkDir, { recursive: true, force: true });
    fs.rm(mp3Filename, { force: true });
    fs.rm(jsonFilename, { force: true });

    log.info(`transcribing video`);

    const transcription = yield* $(
      Task.parallel(chunks.map(OpenAI.transcribe)).map((transcriptions) =>
        transcriptions.map((x) => x.text).join(' '),
      ),
    );
    log.info(`Transcribed video: ${mp3Filename}`);

    const summaryChunks = OpenAI.chunk(transcription);
    if (summaryChunks.length === 1) {
      return OpenAI.chat([
        OpenAI.chat.makeSystemMessage(transcriptionNoChunkPrompt),
        OpenAI.chat.makeUserMessage(transcription),
      ]).map(
        (summary) =>
          ({
            transcription,
            summary,
          }) as TranscriptionResponse,
      );
    }
    const responses = yield* $(
      Task.parallel(
        OpenAI.chunk(transcription).map((chunked) =>
          OpenAI.chat([
            OpenAI.chat.makeSystemMessage(
              transcriptionChunkPrompt(chunks.length),
            ),
            OpenAI.chat.makeUserMessage(chunked),
          ]),
        ),
      ),
    );

    return OpenAI.chat([
      OpenAI.chat.makeSystemMessage(JoinChunksPrompt),
      OpenAI.chat.makeUserMessage(responses.join('\n')),
    ]).map((summary) => ({
      transcription,
      summary,
    }));
  });
}

const transcriptionNoChunkPrompt = `You are a study helper. You will be given a transcript of audio for an educational video. Your task is to summarize the transcript, provide all the key points, and a study guide for the video.
Be aware that the transcript may contain errors. If you notice any errors, please correct them.

Requirements:
- Provide a summary of the video
- Provide a list of key points for the video

Example:
---
Transcript: {{transcript}}
Response:
---
Summary:
{{summary}}
Key Points:
- {{key_point_1}}
...`;

const transcriptionChunkPrompt = (
  parts: number,
) => `You are a study helper. You will be given a transcript of audio for an educational video. Your task is to summarize the transcript, provide all the key points, and a study guide for the video.
This transcript has been split into ${parts} parts. You will be given a part of the transcript to summarize.

Requirements:
- Provide a summary of the video
- Provide a list of key points for the video
- Provide a study guide for the video
- Provide a list of questions for the video
- The output must be as short as possible
- The output must be in a format only you can understand
- The output must be in a format that can be decoded later

Example:
Transcript: {{transcript}}
---
Unencoded Response:
Summary:
{{summary}}
Key Points:
- {{key_point_1}}
...
--
Encoded Response:
{{encoded_response}}
`;

const JoinChunksPrompt = `You are a study helper. You will be given a chunked, minimized, and encoded study guide for an educational video. Your task is to join the chunks together into a single study guide.
Requirements:
- Merge the chunks into a single study guide
- Decode the study guide into a language that can be understood by others
- Ensure that the study guide is coherent and understandable
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
`;

export const BibleTools = {
  search,
  summaryTranscription,
};

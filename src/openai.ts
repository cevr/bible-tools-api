import { File, FormData, request } from "undici";
import { AsyncTask, Result, Task } from "ftld";
import { z } from "zod";

import { env } from "./env";
import { log } from "./index";
import { DomainError } from "./domain-error";
import { wrapZod } from "./utils";

class OpenAIEmbedFailedError extends DomainError {}
class OpenAIEmbedNoEmbeddingError extends DomainError {}

const embedResSchema = wrapZod(
  z.object({
    data: z
      .array(
        z.object({
          embedding: z.array(z.number()).nonempty(),
        })
      )
      .nonempty(),
  })
);

function embed(
  text: string[]
): AsyncTask<OpenAIEmbedFailedError | OpenAIEmbedNoEmbeddingError, number[][]>;
function embed(
  text: string
): AsyncTask<OpenAIEmbedFailedError | OpenAIEmbedNoEmbeddingError, number[]>;
function embed(
  text: string | string[]
): AsyncTask<
  OpenAIEmbedFailedError | OpenAIEmbedNoEmbeddingError,
  number[] | number[][]
> {
  return Task.from(
    () =>
      request("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          input: text,
          model: "text-embedding-ada-002",
        }),
      }).then((res) => res.body.json()) as Promise<unknown>,
    (err) =>
      new OpenAIEmbedFailedError({
        meta: err,
      })
  )
    .flatMap((res) =>
      embedResSchema(
        res,
        (issues) =>
          new OpenAIEmbedNoEmbeddingError({
            meta: {
              issues,
              res,
            },
          })
      ).map((res) =>
        res.data.length === 1
          ? res.data[0].embedding
          : res.data.map((x) => x.embedding)
      )
    )
    .tapErr((e) => log.error(e));
}

type Message = {
  role: "user" | "system" | "assistant";
  content: string;
};

class OpenAIChatFailedError extends DomainError {}
class OpenAIChatNoChoicesError extends DomainError {}

type OpenAIChatResponse = {
  choices?: {
    message: {
      content: string;
    };
  }[];
};

const chatResSchema = wrapZod(
  z.object({
    choices: z
      .array(
        z.object({
          message: z.object({
            content: z.string(),
          }),
        })
      )
      .nonempty(),
  })
);

const countTokens = (str: string) => str.split(" ").length;

class MaximumTokensExceededError extends DomainError {}

function chat(messages: (Message[] | Message)[]) {
  return Task.from(
    async () => {
      return request("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo-16k",
          messages: messages.flat(),
          temperature: 0.2,
        }),
      }).then((res) => res.body.json() as OpenAIChatResponse);
    },
    (e) =>
      new OpenAIChatFailedError({
        meta: e,
      })
  )
    .tap((res) => log.info(res))
    .tapErr((e) => log.error(e))
    .flatMap((res) =>
      chatResSchema(
        res,
        (issues) =>
          new OpenAIChatNoChoicesError({
            meta: {
              issues,
              res,
            },
          })
      ).map((x) => x.choices[0].message.content)
    );
}

class OpenAITranscribeFailedError extends DomainError {}
class OpenAITranscribeNoTextError extends DomainError {}

const transcribeResSchema = wrapZod(
  z.object({
    text: z.string().nonempty(),
  })
);

function transcribe(audio: Buffer) {
  const formData = new FormData();
  const file = new File([new Blob([audio])], "audio.wav", {
    type: "audio/wav",
  });
  formData.append("file", file);
  formData.append("model", "whisper-1");
  formData.append("temperature", "0.2");
  return Task.from(
    () =>
      request("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "user-agent": "bible-tools",
        },
        body: formData,
      }).then((res) => res.body.json()) as Promise<{
        text?: string;
      }>,

    (e) =>
      new OpenAITranscribeFailedError({
        meta: e,
      })
  )
    .tapErr((err) => log.error(err))
    .flatMap((res) =>
      transcribeResSchema(
        res,
        (issues) =>
          new OpenAITranscribeNoTextError({
            meta: { issues, res },
          })
      )
    )
    .tap((res) => log.info(res))
    .tapErr((err) => log.error(err));
}

const maxTokens = 8192 * 0.75;
const chunk = (text: string) => {
  const words = text.split(" ");
  const chunks = [];
  let chunk = "";
  for (const word of words) {
    if (chunk.length + word.length + 1 > maxTokens) {
      chunks.push(chunk);
      chunk = "";
    }
    chunk += word + " ";
  }
  chunks.push(chunk);
  return chunks;
};

const assertWordCount = (text: string) => {
  if (!(text.split(" ").length <= maxTokens)) {
    throw new Error(`Text is too long. Max word count is ${maxTokens}`);
  }
};

function makeUserMessage(content: string): Message[] {
  return chunk(content).map((content) => ({
    role: "user",
    content,
  }));
}

function makeSystemMessage(content: string): Message {
  assertWordCount(content);
  return {
    role: "system",
    content,
  };
}

function makeAssistantMessage(content: string): Message {
  assertWordCount(content);
  return {
    role: "assistant",
    content,
  };
}

export const OpenAI = {
  embed,
  chat: Object.assign(chat, {
    makeUserMessage,
    makeSystemMessage,
    makeAssistantMessage,
  }),
  transcribe,
  chunk,
};

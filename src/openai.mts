import { File, FormData, request } from "undici";
import { Result, Task } from "ftld";

import { Embedding } from "./api.mjs";
import { env } from "./env.mjs";
import { log } from "./index.mjs";
import { DomainError } from "./domain-error.js";

type OpenAIEmbedFailedError = DomainError<"OpenAIEmbedFailedError">;
const OpenAIEmbedFailedError = DomainError.make("OpenAIEmbedFailedError");

function embed(text: string): Task<OpenAIEmbedFailedError, Embedding> {
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
      })
        .then((res) => res.body.json())
        .then(
          (res) => res.data[0].embedding as Embedding
        ) as Promise<Embedding>,
    (err) =>
      OpenAIEmbedFailedError({
        meta: err,
      })
  ).tapErr((e) => log.error(e));
}

type Message = {
  role: "user" | "system" | "assistant";
  content: string;
};

type OpenAIChatFailedError = DomainError<"OpenAIChatFailedError">;
const OpenAIChatFailedError = DomainError.make("OpenAIChatFailedError");

type OpenAIChatNoChoicesError = DomainError<"OpenAIChatNoChoicesError">;
const OpenAIChatNoChoicesError = DomainError.make("OpenAIChatNoChoicesError");

function chat(messages: Message[]) {
  return Task.from(
    () =>
      request("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages,
          temperature: 0.2,
        }),
      }).then((res) => res.body.json()) as Promise<{
        choices: {
          message: {
            content: string;
          };
        }[];
      }>,
    (e) =>
      OpenAIChatFailedError({
        meta: e,
      })
  )
    .tap((res) => log.info(res))
    .tapErr((e) => log.error(e))
    .flatMap((res) =>
      Result.fromPredicate(
        res.choices,
        () =>
          OpenAIChatNoChoicesError({
            meta: res,
          }),
        (x) => res.choices.length > 0
      ).map((x) => x[0].message.content)
    );
}

type OpenAITranscribeFailedError = DomainError<"OpenAITranscribeFailedError">;
const OpenAITranscribeFailedError = DomainError.make(
  "OpenAITranscribeFailedError"
);

function transcribe(audio: Buffer) {
  const formData = new FormData();
  const file = new File([audio], "audio.m4a");
  formData.append("file", file);
  formData.append("model", "whisper-1");
  formData.append("temperature", "0.2");
  return Task.from(
    () =>
      request("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: formData,
      }).then((res) => res.body.json()) as Promise<{
        text: string;
      }>,

    (e) =>
      OpenAITranscribeFailedError({
        meta: e,
      })
  )
    .tapErr((err) => log.error(err))
    .tap((res) => log.info(res))
    .map((res) => res.text)
    .tapErr((err) => log.error(err));
}

function makeUserMessage(content: string): Message {
  return {
    role: "user",
    content,
  };
}

function makeSystemMessage(content: string): Message {
  return {
    role: "system",
    content,
  };
}

function makeAssistantMessage(content: string): Message {
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
};

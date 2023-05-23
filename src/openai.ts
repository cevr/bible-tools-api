import { File, FormData, request } from "undici";
import { AsyncTask, Result, Task } from "ftld";

import { Embedding } from "./api";
import { env } from "./env";
import { log } from "./index";
import { DomainError } from "./domain-error";

class OpenAIEmbedFailedError extends DomainError {}

type NonEmptyArray<A> = [A, ...A[]];

function embed(text: string) {
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
        .then((res) => res.data[0].embedding as Embedding),
    (err) =>
      new OpenAIEmbedFailedError({
        meta: err,
      })
  ).tapErr((e) => log.error(e));
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

const countTokens = (str: string) => str.split(" ").length;

class MaximumTokensExceededError extends DomainError {}

function chat(messages: (Message[] | Message)[]) {
  return Task.from(
    async () => {
      const totalTokens = messages
        .flat()
        .reduce((total, message) => total + countTokens(message.content), 0);
      if (totalTokens > maxTokens) {
        return Result.Err(
          new MaximumTokensExceededError({
            meta: {
              totalTokens,
              maxTokens,
            },
          })
        );
      }
      return request("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
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
      Result.fromPredicate(
        res.choices,
        (
          x
        ): x is NonEmptyArray<
          Required<OpenAIChatResponse>["choices"][number]
        > => !!x && x.length > 0,
        () =>
          new OpenAIChatNoChoicesError({
            meta: res,
          })
      ).map((x) => x[0].message.content)
    );
}

class OpenAITranscribeFailedError extends DomainError {}
class OpenAITranscribeNoTextError extends DomainError {}

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
      Result.fromPredicate(
        res.text,
        (x): x is NonNullable<typeof x> => !!x,
        () => new OpenAITranscribeNoTextError()
      )
    )
    .tap((res) => log.info(res))
    .tapErr((err) => log.error(err));
}

const maxTokens = 8192;
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

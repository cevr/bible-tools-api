import { request } from "undici";
import { Task } from "ftld";

import { Embedding } from "./search-embeddings.mjs";
import { env } from "./env.mjs";
import { log } from "./index.mjs";

class OpenAIEmbedFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAIEmbedFailedError";
  }
}

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
        .then((res) => res.data[0].embedding as Embedding),
    (err) => {
      log.error(err);
      return new OpenAIEmbedFailedError("Could not connect to OpenAI API");
    }
  );
}

export const OpenAI = {
  embed,
};

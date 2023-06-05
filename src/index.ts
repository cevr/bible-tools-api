import Fastify from "fastify";
import { Do } from "ftld";
import * as z from "zod";

import { BibleTools } from "./api";
import { env } from "./env";
import { wrapZod, fs, chunk } from "./utils";
import { addEmbeddingsToDB } from "./embedding-tools";

const pretty = {
  transport: {
    target: "pino-pretty",
    options: {
      translateTime: "HH:MM:ss Z",
      ignore: "pid,hostname",
    },
  },
};

const envToLogger = {
  development: pretty,
  production: pretty,
  test: false,
};
export const fastify = Fastify({
  logger: envToLogger[env.NODE_ENV],
});

export const log = fastify.log;

fastify.get("/", (request, reply) => {
  reply.redirect("https://cvr.im/bible-tools");
});

// Declare a health check route
fastify.get("/health", async (request, reply) => {
  return reply.send({ ok: true }).status(200);
});

const searchSchema = wrapZod(
  z.object({
    q: z.string(),
  })
);

fastify.get("/search", async (req, reply) => {
  await Do(function* ($) {
    const { q } = yield* $(searchSchema(req.query));

    const data = yield* $(BibleTools.search(q));
    log.info(data);
    reply.send(data).status(200);
  })
    .tapErr((err) => {
      log.error(err);
      reply
        .send({
          error: "Could not search",
        })
        .status(500);
    })
    .run();
});

const transcribeSchema = wrapZod(
  z.object({
    url: z.string().url(),
  })
);
fastify.get("/transcribe", async (req, reply) => {
  await Do(function* ($) {
    const { url } = yield* $(transcribeSchema(req.query));
    return BibleTools.summaryTranscription(url);
  }).match({
    Ok: (data) => {
      log.info(data);
      reply.send(data).status(200);
    },
    Err: (err) => {
      log.error(err);
      reply
        .send({
          message: "Could not transcribe",
          error: err,
        })
        .status(500);
    },
  });
});

fastify.get("/db", async (req, reply) => {
  await addEmbeddingsToDB()
    .tapErr((err) => log.error(err))
    .run();
});

// Run the server!
fastify.listen(
  {
    port: +env.PORT,
    host: env.NODE_ENV === "development" ? "localhost" : "0.0.0.0",
  },
  async (err, address) => {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
  }
);

process.on("uncaughtException", (err) => {
  log.error(err);
  process.exit(1);
});

process.on("SIGINT", () => {
  log.info("SIGINT signal received.");
  process.exit(0);
});

process.on("SIGTERM", () => {
  log.info("SIGTERM signal received.");
  process.exit(0);
});

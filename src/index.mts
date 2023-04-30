import "dotenv/config";
import Fastify from "fastify";
import { Result } from "ftld";
import * as z from "zod";

import { BibleTools } from "./api.mjs";

import { env } from "./env.mjs";

const envToLogger = {
  development: {
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  },
  production: true,
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
  if (BibleTools.isLoading()) {
    return reply.send({ ok: false }).status(500);
  }
  return reply.send({ ok: true }).status(200);
});

const schemaToResult =
  <T extends z.Schema>(schema: T) =>
  <A, _>(value: A): Result<z.ZodIssue[], z.infer<T>> => {
    const res = schema.safeParse(value);
    if (res.success) {
      return Result.Ok(res.data);
    }
    return Result.Err(res.error.errors);
  };

const searchSchema = schemaToResult(
  z.object({
    q: z.string(),
  })
);

fastify.get("/search", async (req, reply) => {
  await searchSchema(req.query)
    .toTask()
    .flatMap(({ q }) => BibleTools.search(q))
    .match({
      Ok: (data) => {
        log.info(data);
        reply.send(data).status(200);
      },
      Err: (err) => {
        log.error(err);
        reply
          .send({
            error: "Could not search",
          })
          .status(500);
      },
    });
});

BibleTools.preload();

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
    fastify.log.info("Loading embeddings...");
  }
);

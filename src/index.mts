import "dotenv/config";
import Fastify from "fastify";
import { Result } from "ftld";
import * as z from "zod";

import {
  getBibleEmbeddings,
  getEgwEmbeddings,
  search,
} from "./load-embeddings.mjs";

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

// Declare a health check route
fastify.get("/", async (request, reply) => {
  return { status: "ok" };
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
  return searchSchema(req.query)
    .toTask()
    .flatMap(({ q }) => search(q))
    .match({
      Ok: (data) => {
        reply.send(data);
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

// Run the server!
fastify.listen({ port: +env.PORT }, async (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info("Loading embeddings...");
  getBibleEmbeddings();
  getEgwEmbeddings();
});

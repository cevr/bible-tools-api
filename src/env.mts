import * as z from "zod";

const envSchema = z.object({
  OPENAI_API_KEY: z.string(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .optional()
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;
export const env: Env = envSchema.parse(process.env);

import * as z from "zod";

const envSchema = z.object({
  OPENAI_API_KEY: z.string(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .optional()
    .default("development"),
  PORT: z.string().optional().default("3000"),
});

export type Env = z.infer<typeof envSchema>;
export const env: Env = envSchema.parse(process.env);

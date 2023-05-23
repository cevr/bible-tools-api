import * as z from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .optional()
    .default("development"),
  PORT: z.string().optional().default("4242"),
  OPENAI_API_KEY: z.string(),
  EGW_CLIENT_ID: z.string(),
  EGW_CLIENT_SECRET: z.string(),
});

export type Env = z.infer<typeof envSchema>;
export const env: Env = envSchema.parse(process.env);

import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(1).optional(),
);

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: optionalString,
  DATABASE_SSL_CA_BASE64: optionalString,
  AUTH_SECRET: optionalString,
  AUTH_GOOGLE_ID: optionalString,
  AUTH_GOOGLE_SECRET: optionalString,
  AI_PROVIDER: z.enum(["openai", "mock"]).default("openai"),
  AI_API_KEY: optionalString,
  AI_MODEL: z.string().min(1).default("gpt-4.1-mini"),
  STT_PROVIDER: z.enum(["openai", "mock"]).default("openai"),
  STT_API_KEY: optionalString,
  STT_MODEL: z.string().min(1).default("gpt-4o-mini-transcribe"),
  TTS_PROVIDER: z.enum(["openai", "mock"]).default("openai"),
  TTS_API_KEY: optionalString,
  TTS_MODEL: z.string().min(1).default("gpt-4o-mini-tts"),
  STORAGE_PROVIDER: z.enum(["r2"]).optional(),
  STORAGE_BUCKET: optionalString,
  STORAGE_ENDPOINT: optionalString,
  STORAGE_ACCESS_KEY: optionalString,
  STORAGE_SECRET_KEY: optionalString,
  RAZORPAY_KEY_ID: optionalString,
  RAZORPAY_KEY_SECRET: optionalString,
  RAZORPAY_WEBHOOK_SECRET: optionalString,
  REDIS_URL: optionalString,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export interface PublicEnv {
  readonly appUrl: string;
}

const productionRequired = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "AI_API_KEY",
] as const satisfies ReadonlyArray<keyof ServerEnv>;

export function getServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.parse(process.env);

  if (parsed.NODE_ENV === "production") {
    const missing = productionRequired.filter((key) => !parsed[key]);

    if (missing.length > 0) {
      throw new Error(`Invalid production configuration: missing ${missing.join(", ")}`);
    }
  }

  return parsed;
}

export const publicEnv: PublicEnv = Object.freeze({
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
});

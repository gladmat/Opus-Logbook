import { z } from "zod";

/**
 * Server environment variable validation.
 * Fails hard at startup if required variables are missing or malformed.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  PORT: z
    .string()
    .default("5000")
    .transform((val) => parseInt(val, 10))
    .refine(
      (val) => !isNaN(val) && val > 0 && val < 65536,
      "PORT must be a valid port number",
    ),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Optional variables
  RESEND_API_KEY: z.string().optional(),
  RAILWAY_PUBLIC_DOMAIN: z.string().optional(),
  APP_DOMAIN: z.string().optional(),
  ENABLE_SEED: z.string().optional(),
  SEED_TOKEN: z.string().optional(),
  EXPO_ACCESS_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    console.error("Environment validation failed:\n" + formatted);
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();

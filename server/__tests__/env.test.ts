import { describe, it, expect } from "vitest";
import { envSchema } from "../env";

const BASE = {
  DATABASE_URL: "postgresql://x/y",
  JWT_SECRET: "a".repeat(48),
  PORT: "5000",
};

describe("envSchema JWT_SECRET validation", () => {
  it("accepts a strong production secret", () => {
    const result = envSchema.safeParse({
      ...BASE,
      NODE_ENV: "production",
      JWT_SECRET: "a".repeat(48),
    });
    expect(result.success).toBe(true);
  });

  it("rejects JWT_SECRET shorter than 32 chars", () => {
    const result = envSchema.safeParse({ ...BASE, JWT_SECRET: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects 'local-dev-secret-change-in-production' in production", () => {
    const result = envSchema.safeParse({
      ...BASE,
      NODE_ENV: "production",
      JWT_SECRET: "local-dev-secret-change-in-production-0000",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("JWT_SECRET")),
      ).toBe(true);
    }
  });

  it("rejects any production secret containing the word 'example'", () => {
    const result = envSchema.safeParse({
      ...BASE,
      NODE_ENV: "production",
      JWT_SECRET: "example-prod-secret-but-32-chars-long!!",
    });
    expect(result.success).toBe(false);
  });

  it("allows the literal vitest test secret in non-production envs", () => {
    // The vitest config sets JWT_SECRET to "test-secret-key-minimum-32-characters-long".
    // That value must NOT trip the blocklist when NODE_ENV=test or development.
    const result = envSchema.safeParse({
      ...BASE,
      NODE_ENV: "test",
      JWT_SECRET: "test-secret-key-minimum-32-characters-long",
    });
    expect(result.success).toBe(true);
  });

  it("rejects the vitest test secret when NODE_ENV=production", () => {
    const result = envSchema.safeParse({
      ...BASE,
      NODE_ENV: "production",
      JWT_SECRET: "test-secret-key-minimum-32-characters-long",
    });
    expect(result.success).toBe(false);
  });
});

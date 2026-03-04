import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["server/__tests__/**/*.test.ts"],
    testTimeout: 10000,
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/testdb",
      JWT_SECRET: "test-secret-key-minimum-32-characters-long",
      NODE_ENV: "test",
    },
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});

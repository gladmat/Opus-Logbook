import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["server/__tests__/**/*.test.ts", "client/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 10000,
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/testdb",
      JWT_SECRET: "test-secret-key-minimum-32-characters-long",
      NODE_ENV: "test",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["client/lib/**/*.ts", "server/**/*.ts", "shared/**/*.ts"],
      exclude: [
        "**/__tests__/**",
        "**/*.test.{ts,tsx}",
        "**/*.config.{js,ts}",
        "client/lib/diagnosisPicklists/**",
        "client/lib/procedurePicklist.ts",
        "server/seedData.ts",
      ],
      // Thresholds set just below current baseline (52.95% lines / 56.01%
      // functions / 48.31% branches / 52.42% statements as of 2026-06-10)
      // so any meaningful regression fails CI but existing tests pass.
      // Raise these when adding tests, never lower. The case-form
      // happy-path integration test (planned) and the API-caller test
      // pass should let us push these meaningfully higher.
      thresholds: {
        lines: 52,
        functions: 55,
        branches: 47,
        statements: 52,
      },
    },
  },
  // Metro / React Native inject __DEV__ at bundle time; provide it for Vitest
  // so files that transitively import from expo-modules-core or react-native
  // can load in the node test environment.
  define: {
    __DEV__: "true",
  },
  resolve: {
    alias: {
      "react-native": "react-native-web",
      "@": path.resolve(__dirname, "client"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});

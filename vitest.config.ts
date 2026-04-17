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

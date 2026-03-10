import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["server/__tests__/**/*.test.ts", "client/**/*.test.{ts,tsx}"],
    testTimeout: 10000,
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/testdb",
      JWT_SECRET: "test-secret-key-minimum-32-characters-long",
      NODE_ENV: "test",
    },
  },
  resolve: {
    alias: {
      "react-native": "react-native-web",
      "@": path.resolve(__dirname, "client"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});

// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: [
      "dist/**",
      "server_dist/**",
      ".expo/**",
      ".claude/**",
      "attached_assets/**",
      "uploads/**",
    ],
  },
  {
    // Guard against regressions to `new Date("YYYY-MM-DD")` on date-only
    // fields. That parses as UTC-midnight and silently drifts by a day for
    // users in negative-UTC timezones. Always use `parseIsoDateValue` /
    // `parseDateOnlyValue` from `@/lib/dateValues` for `YYYY-MM-DD`-shaped
    // inputs like `procedureDate`, `admissionDate`, `dischargeDate`,
    // `injuryDate`, `resolvedDate`, `onsetDate`, etc.
    //
    // Pattern matches `new Date("...")` / `new Date('...')` — string literals
    // only. ISO timestamps, variables, and Date() with no args are still
    // allowed. If you need to legitimately parse an ISO *timestamp* string,
    // use `normalizeIsoTimestampValue` from the same module.
    //
    // The rule is not attached to test files so fixtures can use plain
    // literals freely.
    files: ["client/**/*.{ts,tsx}", "server/**/*.ts", "shared/**/*.ts"],
    ignores: [
      "**/__tests__/**",
      "**/*.test.{ts,tsx}",
      "client/lib/dateValues.ts",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "NewExpression[callee.name='Date'][arguments.length=1][arguments.0.type='Literal'][arguments.0.value=/^\\d{4}-\\d{2}-\\d{2}$/]",
          message:
            "Don't `new Date('YYYY-MM-DD')` — parses as UTC midnight and drifts in non-UTC timezones. Use `parseIsoDateValue` / `parseDateOnlyValue` from `@/lib/dateValues`.",
        },
      ],
    },
  },
  {
    // Block direct `expo-secure-store` imports anywhere except the wrapper
    // module itself. The wrapper applies `WHEN_UNLOCKED_THIS_DEVICE_ONLY` to
    // every write so the keychain entries are unreadable to AFU-mode
    // forensic tools (Cellebrite, GrayKey). Bypassing the wrapper silently
    // weakens that protection.
    files: ["client/**/*.{ts,tsx}"],
    ignores: [
      "client/lib/secureStorage.ts",
      "**/__tests__/**",
      "**/*.test.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "expo-secure-store",
              message:
                "Import from `@/lib/secureStorage` instead — it applies WHEN_UNLOCKED_THIS_DEVICE_ONLY by default. Direct imports defeat the AFU-mode forensic protections.",
            },
          ],
        },
      ],
    },
  },
]);

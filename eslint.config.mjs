import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Not application code, and deliberately not held to app code standards:
    //   src/app/demos/ - generated sales demo pages
    //   scripts/       - operational/verification scripts run outside the app
    //   migrations/    - raw SQL
    // Scoped this way the gate covers the code that actually ships.
    "src/app/demos/**",
    "scripts/**",
    "migrations/**",
  ]),
]);

export default eslintConfig;

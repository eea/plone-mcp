// @ts-check

// import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";

export default defineConfig(
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript,
    ],
    settings: {
      "import/resolver": {
        typescript: {
          project: [
            "./tsconfig.json",
            "./tsconfig.test.json",
            "./tsconfig.eslint.json",
          ],
        },
      },
    },
  },
);

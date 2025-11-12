import globals from "globals";
import pluginJs from "@eslint/js";
import tseslintPlugin from "@typescript-eslint/eslint-plugin";
import tseslintParser from "@typescript-eslint/parser";
import pluginImport from "eslint-plugin-import";

export default [
  {
    files: ["**/*.js", "**/*.ts"],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        project: './tsconfig.eslint.json',
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.vitest,
        NodeJS: true,
      },
    },
    plugins: {
      '@typescript-eslint': tseslintPlugin,
      'import': pluginImport,
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
      ...tseslintPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-unused-vars': 'off', // Disable base ESLint rule

    },
  },
];
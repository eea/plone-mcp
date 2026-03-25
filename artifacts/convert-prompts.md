# Plan for Migrating Prompts to `src/prompts`

## Objective
Convert the existing prompt definitions within `src/index.ts`'s `setupPrompts` method into individual prompt files located in `src/prompts/`, following the `xmcp` directory-based prompt discovery convention.

## Current State
The `src/index.ts` file explicitly defines two prompts (`create-page-workflow` and `create-example-site-workflow`) using `this.server.registerPrompt`. Each definition includes:
- A unique `name`.
- A `title` and `description`.
- An `argsSchema` (input schema) defined using `zod`.
- A handler function that returns a message structure.

## Target State
Each prompt will reside in its own `.ts` file within the `src/prompts/` directory. Each file will export:
- `schema`: The Zod schema for the prompt's arguments.
- `metadata`: An object containing `name`, `title`, `description`, and `role`.
- A `default` export: The handler function for the prompt.

The `src/index.ts` file will be modified to remove the manual `registerPrompt` calls, relying instead on `xmcp`'s automatic discovery of prompts from the `src/prompts/` directory.

## Step-by-Step Plan

1.  **Create `src/prompts` directory (if it doesn't exist):**
    *   Verify the directory exists. If not, create it.

2.  **Create `src/prompts/create-page-workflow.ts`:**
    *   Extract the `argsSchema` from `create-page-workflow` in `src/index.ts` and define it as `export const schema = { ... }`.
    *   Extract `name`, `title`, `description` and define them as `export const metadata: PromptMetadata = { ... }`, ensuring `role: "user"` is included.
    *   Extract the handler function logic and define it as `export default function createPageWorkflow({ contentType, purpose, audience }: InferSchema<typeof schema>) { ... }`. Ensure it returns the prompt text directly as a string or the `{ type: "text", text: "..." }` object. I will choose to return the string directly for simplicity.

3.  **Create `src/prompts/create-example-site-workflow.ts`:**
    *   Extract the `argsSchema` from `create-example-site-workflow` in `src/index.ts` and define it as `export const schema = { ... }`.
    *   Extract `name`, `title`, `description` and define them as `export const metadata: PromptMetadata = { ... }` ensuring `role: "user"` is included.
    *   Extract the handler function logic and define it as `export default function createExampleSiteWorkflow({ contentTypes, purpose, numberOfPages = "3", audience }: InferSchema<typeof schema>) { ... }`. Ensure it returns the prompt text directly as a string.

4.  **Modify `src/index.ts`:**
    *   Remove the `setupPrompts()` method and its call from the constructor. `xmcp` will automatically discover the prompts.
    *   Remove any related `import` statements that are no longer needed (e.g., `z`).
    *   Add the `setupPrompts` method for future prompts that might need to be set up.
5.  **Verify changes:**
    *   Run `make format` to ensure code style.
    *   Run `make type-check` to ensure no TypeScript errors.
    *   Run `make test` to ensure existing tests still pass.

## Rollback Plan
If any issues arise, revert the changes using Git.

```bash
git restore src/index.ts src/prompts/create-page-workflow.ts src/prompts/create-example-site-workflow.ts
rm -rf src/prompts # If the directory was created
```
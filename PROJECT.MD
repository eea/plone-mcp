# Readme for AI Assistant Agents

This whole file contains help for AI Assistant Agents and should not be deleted.

## Project Overview

This project is a Model Context Protocol (MCP) server designed to integrate MCP clients with a Plone CMS via its REST API. It provides a comprehensive set of tools for managing Plone content. The server is built with Node.js and TypeScript, leveraging the `xmcp` framework for MCP server implementation and `axios` for HTTP communication with the Plone REST API. It uses `zod` for schema validation.

## Development Conventions

- **Code Structure:** The main application logic resides in `src/index.ts`, which defines the MCP server, registers tools, and handles interactions with the Plone REST API. Block specifications are loaded from `src/blocks.json`.
- **Configuration:** Plone connection details can be provided via tool arguments or environment variables (`PLONE_BASE_URL`, `PLONE_USERNAME`, `PLONE_PASSWORD`, `PLONE_TOKEN`).
- **Block Management:** The server includes sophisticated logic for managing Volto blocks, including preparing block layouts, adding, updating, and removing individual blocks. It also handles the conversion of text blocks to Slate format and validates image URLs.
- **Error Handling:** Errors are wrapped to provide context about the operation that failed.

## Important Reminders

- Tests are to be run whenever substantial changes are done to the code. Use `make test`.
- **Critical**: tests should be run using `make test`, not `pnpm run test`
- TypeScript type errors are important, use `make type-check` and try to fix them.
- The formatting target should be executed before committing code. Use `make format`.
- Important!!! Never trigger a `git commit` unless the user explicitly asked for that operation to be performed.

For more details read [README.md](./README.md) and [TESTING.md](./TESTING.md) and [XMCP.md](./artifacts/XMCP.md)

## Makefile Targets

- `all`: Show this help.
- `format`: Format code using Prettier.
- `test`: Run all tests.
- `type-check`: Run TypeScript type checking

## Important Agent Behavior Guidelines

- **File Deletion Policy**: Never delete any files unless explicitly instructed by the user. Always confirm with the user before performing any deletion actions. All modifications, including deletions, must be clearly communicated and approved.
- **Respect All Files**: Do not assume any file is unnecessary or created in error. If a file appears to be out of place or unrelated to the current task, always inquire with the user before taking any action.

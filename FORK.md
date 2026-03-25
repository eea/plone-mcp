# Fork Overview: Official SDK Migration

This branch (`eea_no_xmcp`) represents a major architectural shift for the `plone-mcp` server, migrating it from the legacy, file-routing-based `xmcp` framework to the official `@modelcontextprotocol/sdk` by Anthropic.

## Architectural Changes

### 1. SDK Migration
- **Framework Swap**: Removed all dependencies on `xmcp` and transitioned to the official Model Context Protocol TypeScript SDK.
- **Explicit Registration**: Replaced the automatic file-based tool/resource discovery with explicit registration in `src/tools/index.ts`, `src/resources/index.ts`, and `src/prompts/index.ts`.
- **Zod Integration**: All tools now use `zod` schemas for robust, type-safe input validation.

### 2. Stateful Session Support
- **Multi-Transport Entry Points**:
    - `src/http-server.ts`: A new Express-based server supporting stateful HTTP sessions via SSE (Server-Sent Events) and custom `mcp-session-id` headers.
    - `src/stdio-server.ts`: A standard STDIO transport for CLI and local integration.
- **Session Manager**: The `PloneService` and its underlying `PloneClient` (authentication state) are now persisted per-session. This allows tools like `plone_configure` to establish authentication once, which then persists across subsequent tool calls in the same session.

### 3. Structural Refactoring
- **Resource Organization**: Moved resources out of the legacy `(plone)` subfolder to a flatter, more standard structure in `src/resources/`.
- **Tool Standardisation**: Converted all 20 tools from individual default exports to named objects that conform to the official SDK's `registerTool` expectations.
- **Logic Consolidation**: Centralized the logic for handling session context via `RequestHandlerExtra`.

## Quality & Compliance

### 1. Robust Type Safety
- **Strict Linting**: Fixed 64 lint errors, including the removal of forbidden non-null assertions and redundant `any` types.
- **TypeScript Alignment**: Ensured full compatibility with `NodeNext` module resolution and ESM imports.
- **Official Types**: Utilized official SDK types (`ServerRequest`, `ServerNotification`, `Transport`) throughout the codebase.

### 2. Verified Stability
- **Comprehensive Testing**: Refactored the entire test suite (172 integration and unit tests) to pass with the new SDK architecture.
- **Clean Registry**: Implemented refined tool filtering (`ENABLED_TOOLS`) that ensures critical tools like `plone_configure` are always available.
- **Production Ready**: Updated `Dockerfile`, `Makefile`, and `package.json` to support a lean, production-grade build using the official npm package.

## Comparison Summary

| Feature | Legacy (xmcp) | Modern (Official SDK) |
|---------|---------------|------------------------|
| **Framework** | xmcp (custom) | @modelcontextprotocol/sdk |
| **Routing** | File-system based | Explicit registration |
| **Sessions** | Stateless / Limited | Fully Stateful (HTTP + SSE) |
| **Validation** | Implicit | Explicit Zod Schemas |
| **Types** | Implicit / Any | Strict TypeScript |
| **Maintenance** | Custom framework debt | Official standard alignment |

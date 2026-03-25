# Fork Overview: EEA Enhanced Plone MCP Server

This branch (`eea_no_xmcp`) is a specialized fork of the official [plone/plone-mcp](https://github.com/plone/plone-mcp) repository. It maintains the core architectural alignment with the official MCP SDK while introducing several critical features required for high-availability and multi-user environments.

## Relationship with Upstream (`plone/main`)

This fork is **upstream-compatible** but functionally extended. While an intermediate stage of this fork experimented with the `xmcp` framework (stored in the `eea` branch), this `eea_no_xmcp` branch has **fully reverted to the official @modelcontextprotocol/sdk**, matching the upstream's choice of library.

## Key Enhancements in this Fork

The following features are unique to this EEA fork and are not currently present in the upstream `plone/main` branch:

### 1. Stateful HTTP Server & Multi-Transport Support
- **Upstream**: Provides a single `src/index.ts` entry point primarily designed for the STDIO transport (standard CLI/Claude Desktop local integration).
- **This Fork**: Splits the server into dedicated entry points for different environments:
    - **`src/http-server.ts`**: A robust **Express-based HTTP server** that enables remote deployment.
    - **Stateful Sessions**: Introduces `mcp-session-id` header support. This allows multiple concurrent users to have their own isolated authentication states (`PloneClient`) on a single shared server instance.
    - **SSE Notifications**: Implements Server-Sent Events for real-time MCP notifications over HTTP.
    - **`src/stdio-server.ts`**: Retains full compatibility with local STDIO integration.

### 2. Enterprise-Grade Tool Filtering
- **`ENABLED_TOOLS` Support**: Introduces a security-focused environment variable (`ENABLED_TOOLS`) to whitelist only specific MCP tools at startup.
- **Hardened Defaults**: Ensures that `plone_configure` is always available for authentication, while other potentially destructive tools (like `plone_delete_content`) can be disabled for public-facing deployments.

### 3. Modernized Development & CI Environment
- **Vitest Integration**: Replaced `jest` with `vitest` for significantly faster test execution and better ESM support.
- **Unified ESLint**: Upgraded to a modern, flat-file ESLint configuration (`eslint.config.mjs`) with strict TypeScript rules.
- **Enhanced Documentation**: Provides comprehensive `make` commands and `curl` examples for testing remote HTTP deployments.
- **Modular Refactoring**: Decoupled the monolithic `index.ts` into a maintainable directory structure:
    - `src/tools/`: Individual files per tool.
    - `src/resources/`: Individual files per resource.
    - `src/prompts/`: Individual files per prompt.
    - `src/utils/`: Shared logic for block processing and session management.

## Summary of Differences

| Feature | Upstream (`plone/main`) | EEA Fork (`eea_no_xmcp`) |
|---------|-------------------------|--------------------------|
| **Transports** | STDIO only | **HTTP (SSE)** + STDIO |
| **Concurrency** | Single-user (local) | **Multi-session (remote)** |
| **Tool Filtering** | No | **Yes (`ENABLED_TOOLS`)** |
| **Test Runner** | Jest | **Vitest** |
| **Code Structure** | Monolithic (`index.ts`) | **Modular (src/tools/ etc.)** |
| **SDK Version** | ^1.0.0 | **^1.27.1** |
| **Linting** | Standard | **Strict @typescript-eslint** |

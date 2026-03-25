# Fork Overview: Enhanced Plone MCP Server

This branch (`eea_no_xmcp`) aligns the `plone-mcp` server back with the official [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) while retaining and expanding upon the advanced features developed during the EEA fork.

While an intermediate stage of this fork used the `xmcp` framework, this branch has **completely removed `xmcp`** to return to the standard MCP SDK, ensuring better compatibility with the official ecosystem.

## Key Enhancements over Upstream (`plone/plone-mcp`)

Compared to the original `plone/plone-mcp` main branch, this fork provides the following additional capabilities:

### 1. Stateful HTTP Transport
- **Upstream**: Primarily focused on STDIO transport.
- **This Fork**: Implements a full **Express-based HTTP server** with **Stateful Sessions**.
    - Uses SSE (Server-Sent Events) for MCP notifications.
    - Persists authentication (`PloneClient`) per `mcp-session-id`, allowing a single `plone_configure` call to authenticate an entire session.

### 2. Advanced Volto Block System
- **Expanded Tools**: Includes specialized tools for managing Volto blocks:
    - `plone_create_blocks_layout`: Prepares complex multi-block layouts in memory.
    - `plone_add_single_block`, `plone_update_single_block`, `plone_remove_single_block`: Granular block manipulation.
    - `plone_get_block_schemas`: Dynamic discovery of block data structures.
- **Slate & Markdown**: Automatic conversion of Markdown text to Plone's Slate JSON format.
- **Grid Support**: First-class support for `gridBlock` (multi-column) layouts.

### 3. Robust Schema Validation
- **Zod Integration**: Every tool and resource uses `zod` for strict input validation, providing clear error messages and type safety.
- **Schema Discovery**: Added `plone_get_type_schema` and `plone_get_vocabularies` to help LLMs understand the Plone site's specific configuration.

### 4. Comprehensive Test Suite
- **170+ Tests**: Replaced the basic test setup with a massive suite of integration and unit tests using `vitest`.
- **Mocking**: Advanced mocking of the Plone REST API to ensure reliable CI/CD.

### 5. Production Ready
- **Dockerized**: Includes a multi-stage `Dockerfile` optimized for production.
- **Filtered Tools**: Support for `ENABLED_TOOLS` environment variable to restrict the server's capabilities at runtime.

## Summary of Architectural Differences

| Feature | Upstream (`plone/main`) | EEA Fork (`eea_no_xmcp`) |
|---------|-------------------------|--------------------------|
| **Transport** | STDIO | HTTP (Stateful) + STDIO |
| **Blocks** | Basic | Advanced (Layouts, Grids, Slate) |
| **Validation** | Minimal | Strict Zod Schemas |
| **Content** | Basic CRUD | Advanced Workflow + Search |
| **Tests** | Minimal | 170+ Integration/Unit Tests |
| **Dependencies**| Standard | Optimized (removed xmcp artifacts) |

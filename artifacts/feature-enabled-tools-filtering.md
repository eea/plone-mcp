# Feature: Enabled Tools Filtering (IMPLEMENTED)

This feature allows administrators to restrict the set of tools exposed by the MCP server to clients. It is useful for security, simplifying the AI's action space, or tailoring the server for specific use cases.

## Overview

The Plone MCP Server includes a large number of tools for content management, search, and site administration. In some environments, it is desirable to restrict the set of tools available to the LLM to reduce context noise or enforce security policies without modifying the server's source code.

This feature allows tools to **completely disappear** from the MCP client's view by filtering them out of the `tools/list` response at the transport level.

## Configuration

The feature is controlled by the `ENABLED_TOOLS` environment variable:

- **Variable Name:** `ENABLED_TOOLS`
- **Format:** Comma-separated list of tool names (e.g., `plone_get_content,plone_search`).
- **Default Behavior:** If not set, all tools discovered in `src/tools/` are advertised.
- **Special Case:** `plone_configure` is **always enabled**, as it is required to establish the connection to Plone before any other tool can be used.

## Implementation Details

### The Challenge
The server is built with the `xmcp` framework, which uses a specialized `StatelessStreamableHTTPTransport`. This transport writes directly to the Node.js `res.writeHead` and `res.end` methods, bypassing standard Express `res.send` or `res.json` hooks in many cases.

### The Solution: Low-Level Interception
The implementation uses a robust "Response Interceptor" pattern in `src/middleware.ts` that works at the Node.js `http.ServerResponse` level.

#### 1. Middleware Injection
The `xmcp` framework automatically bundles `./src/middleware.ts` and injects it into the server's request-handling pipeline if the file exists.

#### 2. Robust Interception (`src/middleware.ts`)
The middleware overrides the core methods of the `res` object:

1.  **`res.writeHead`**: Intercepted to remove `Content-Length` headers. Since the middleware might modify the body size (by filtering out tools), the original `Content-Length` would be incorrect and cause the client to hang or error.
2.  **`res.write`**: Intercepted to buffer response chunks.
3.  **`res.end`**: Intercepted to:
    - Collect all chunks into a complete body string.
    - Parse the body as JSON.
    - Identify if it's an MCP `tools/list` response.
    - Filter the `result.tools` array based on the `ENABLED_TOOLS` whitelist.
    - Call the original `res.end` with the modified (or original) body.

## Verification

The feature has been verified with the following steps:

1.  **Start Server with Filter**:
    ```bash
    ENABLED_TOOLS=plone_configure,plone_get_content,plone_search node dist/http.js
    ```
2.  **Query Tool List**:
    ```bash
    curl -s -X POST http://localhost:3001/mcp \
      -H "Content-Type: application/json" \
      -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | jq .result.tools[].name
    ```
3.  **Expected Output**:
    ```
    "plone_configure"
    "plone_get_content"
    "plone_search"
    ```

## Makefile Integration

The following target is available for development testing:

```bash
make dev-filtered
```

This target runs the development server with a limited toolset (`plone_configure`, `plone_get_content`, `plone_search`).

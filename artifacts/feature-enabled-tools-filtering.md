# Feature Specification: Enabled Tools Filtering (`ENABLED_TOOLS`)

This document describes the implementation of the tool filtering feature in the Plone MCP Server, allowing users to restrict which tools are advertised to MCP clients (like Claude Desktop).

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
The server is built with the `xmcp` framework, which automatically discovers all tools in the `src/tools/` directory and registers them with the underlying `@modelcontextprotocol/sdk` server. Because this discovery happens during the build/initialization phase, filtering the tools "at the source" would require modifying the framework or the project's file structure.

### The Solution: JSON-RPC Interception
To make tools truly disappear from the client's perspective (including the LLM's context), we intercept the MCP `tools/list` response before it is sent over the HTTP transport.

#### 1. Framework Integration
The `xmcp` framework provides a hook for custom Express-style middlewares via the `./src/middleware.ts` file. If this file exists, the `xmcp` compiler automatically bundles and injects it into the server's request-handling pipeline.

#### 2. Filtering Middleware (`src/middleware.ts`)
The implementation uses a "Response Interceptor" pattern:

1.  **Read Environment:** It reads and parses the `ENABLED_TOOLS` environment variable.
2.  **Intercept `res.send`:** It wraps the standard Express `res.send` method.
3.  **Identify JSON-RPC:** It checks if the outgoing response is an `application/json` payload.
4.  **Filter `tools/list`:**
    - It parses the response body to identify the MCP `tools/list` JSON-RPC result.
    - It filters the `result.tools` array, removing any tool whose name is not in the allowed list.
    - It updates the `Content-Length` header to match the new, smaller payload.
5.  **Transparent Passthrough:** All other requests and responses pass through unchanged.

### Code Structure

```typescript
// src/middleware.ts logic (simplified)
export default function toolsFilterMiddleware(req, res, next) {
  const enabledToolsEnv = process.env.ENABLED_TOOLS;
  if (!enabledToolsEnv) return next();

  const originalSend = res.send;
  res.send = function (body) {
    // 1. Detect JSON-RPC response
    // 2. Parse body
    // 3. Filter result.tools based on enabledTools + "plone_configure"
    // 4. Update Content-Length and call originalSend
  };
  next();
}
```

## Benefits of this Approach
- **Zero-Config required for Tools:** No changes are needed to individual tool files.
- **Client Agnostic:** Works with any MCP client (Claude Desktop, MCP Inspector, etc.) because it operates at the protocol level.
- **LLM Safety:** Since the tools are not advertised, the LLM will never attempt to call them, as they do not exist in its "tool belt."
- **Performance:** Reduces the size of the initial handshake/context window by only sending relevant tool definitions.

## Maintenance Notes
- This implementation relies on the fact that `xmcp` uses Express for its HTTP transport.
- If the transport is changed to STDIO, this specific middleware will not run (as it's an Express middleware). However, the current project is optimized for HTTP transport.

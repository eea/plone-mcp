# Migration Plan: xmcp → @modelcontextprotocol/sdk

## Overview

This document outlines the migration path from the current xmcp-based implementation to the official `@modelcontextprotocol/sdk` (typescript-sdk v1.x). The goal is to deploy the plone-mcp server as a standalone HTTP server using the official SDK.

### Critical Architecture Decision: Stateful Sessions

**plone-mcp MUST use stateful sessions** because:

1. `PloneClient` stores authentication state (base URL, token/credentials)
2. This state must persist across multiple tool calls within a session
3. Each session has its own `PloneService` instance in `sessionManager`

The SDK pattern we follow is from `simpleStreamableHttp.ts` (not `simpleStatelessStreamableHttp.ts`):

- One `McpServer` instance per session
- Transport stored in `Map<sessionId, Transport>`
- `sessionManager` still used for `PloneService` storage
- Session ID flows: `extra.sessionId` (from SDK) → `sessionManager.getSession(sessionId)` → `PloneService`

---

## 1. Current Architecture Analysis

### 1.1 Current Stack (xmcp-based)

| Component          | Implementation                                                        |
| ------------------ | --------------------------------------------------------------------- |
| Framework          | xmcp v0.6.5                                                           |
| HTTP Transport     | xmcp's built-in HTTP server (`xmcp build` generates `dist/http.js`)   |
| STDIO Transport    | xmcp's built-in stdio handler                                         |
| Session Management | Custom `session-manager.ts` + `plone-service.ts`                      |
| Tool Discovery     | File-based via `xmcp.config.ts` paths                                 |
| Middleware         | Custom `middleware.ts` for ENABLED_TOOLS filtering                    |
| Tool Format        | One file per tool with `schema`, `metadata`, `default export` pattern |

### 1.2 Target Stack (typescript-sdk)

| Component          | Implementation                                                   |
| ------------------ | ---------------------------------------------------------------- |
| Framework          | @modelcontextprotocol/sdk (v1.x from `./typescript-sdk`)         |
| HTTP Transport     | `StreamableHTTPServerTransport` from SDK                         |
| STDIO Transport    | `StdioServerTransport` from SDK                                  |
| Session Management | Built-in to `StreamableHTTPServerTransport` (sessionIdGenerator) |
| Tool Registration  | Manual `server.registerTool()` calls                             |
| Middleware         | Custom Express middleware or SDK middleware                      |
| Tool Format        | Direct handler functions with Zod schemas                        |

---

## 2. Key Differences to Address

### 2.1 Build System

**Current:**

```json
"build": "xmcp build"
```

- xmcp CLI handles TypeScript compilation
- Generates `dist/http.js`, `dist/stdio.js`, `.xmcp/import-map.js`
- Path aliases in tsconfig resolve `xmcp/*` and `plone-mcp/*`

**Target:**

```json
"build": "tsc && node scripts/post-build.js"
```

- Standard TypeScript compilation
- No code generation or import-map needed
- Express app setup manually in entry point

### 2.2 Server Initialization

**Current (xmcp pattern):**

```typescript
// xmcp handles everything based on xmcp.config.ts
import { config } from "xmcp";
```

- Configuration driven by `xmcp.config.ts`
- Tools auto-discovered from directory structure

**Target (SDK pattern):**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const server = new McpServer({ name: "plone-mcp-server", version: "1.0.0" });
// Register tools, resources, prompts manually
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
});
await server.connect(transport);
```

### 2.3 Tool Definition Pattern

**Current:**

```typescript
// src/tools/plone_configure.ts
import { headers } from "xmcp/headers";
import { sessionManager } from "plone-mcp/session-manager";
import { getSessionId } from "plone-mcp/utils/session";
import type { InferSchema, ToolMetadata } from "xmcp";

export const schema = { baseUrl: z.string().optional()... };
export const metadata: ToolMetadata = { name: "plone_configure", ... };

export default async function ploneConfigure(args: InferSchema<typeof schema>) {
  const sessionId = getSessionId(headers());
  const service = sessionManager.getSession(sessionId);
  // ...
}
```

**Target:**

```typescript
// src/tools/plone_configure.ts
import { randomUUID } from "node:crypto";
import * as z from "zod/v4";  // or zod v3
import { sessionManager } from "../session-manager.js";
import { getSessionId } from "../utils/session.js";

const inputSchema = z.object({
  baseUrl: z.string().optional().describe("..."),
  // ...
});

export async function ploneConfigure(args: z.infer<typeof inputSchema>, extra: RequestHandlerExtra) {
  const sessionId = extra.sessionId;  // Direct from SDK
  const service = sessionManager.getSession(sessionId);
  // ...
}

// Export schema for registration
export const toolConfig = {
  name: "plone_configure",
  description: "...",
  inputSchema,
  annotations: { title: "Configure Plone Connection", readOnlyHint: false, ... }
};
```

### 2.4 Session Handling

**Current:**

```typescript
// xmcp provides headers() function globally
import { headers } from "xmcp/headers";
const sessionId = getSessionId(headers());

// Custom session storage
class SessionManager {
  getSession(sessionId: string): PloneService { ... }
}
```

**Target:**

```typescript
// SDK provides sessionId directly in RequestHandlerExtra
async (args, extra: RequestHandlerExtra) => {
  const sessionId = extra.sessionId;
  // ...
};

// Transport handles session ID generation
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
});
```

### 2.5 ENABLED_TOOLS Middleware

**Current:**

```typescript
// src/middleware.ts
// HTTP response interception to filter tools list
export default function toolsFilterMiddleware(req, res, next) {
  const enabledTools = new Set(process.env.ENABLED_TOOLS.split(","));
  // Intercept res.end() to filter JSON response
}
```

**Target Options:**

Option A: Keep response filtering middleware (same approach)
Option B: Dynamic tool registration at startup
Option C: Use SDK's internal filtering mechanism (if available)

---

## 3. Migration Steps

### Phase 1: Project Setup

1. **Update package.json dependencies**
   - Remove: `xmcp`
   - Add: Link to local typescript-sdk: `"@modelcontextprotocol/sdk": "file:./typescript-sdk"`
   - Add: Express/Hono for HTTP server: `@hono/node-server` or `express`
   - Add: Any missing peer dependencies

2. **Update tsconfig.json**
   - Remove xmcp path aliases
   - Add SDK path alias if needed
   - Ensure `module`, `moduleResolution` compatible with SDK

3. **Create new entry points**
   - `src/http-server.ts` - HTTP transport server
   - `src/stdio-server.ts` - STDIO transport server

### Phase 2: Core Server Setup

1. **Create main server factory** (`src/server.ts`)

   ```typescript
   import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

   export function createServer() {
     const server = new McpServer({
       name: "plone-mcp-server",
       version: "1.0.0",
     });

     // Register tools
     registerTools(server);

     // Register resources
     registerResources(server);

     // Register prompts
     registerPrompts(server);

     return server;
   }
   ```

2. **Implement session management integration**
   - Keep `session-manager.ts`, `plone-service.ts` largely intact
   - Update session ID extraction to use SDK's `extra.sessionId`
   - Ensure sessions map to PloneService instances correctly

### Phase 3: Tool Migration

1. **Convert each tool file** from xmcp pattern to SDK pattern:

   | Current                               | Target                                         |
   | ------------------------------------- | ---------------------------------------------- |
   | `export const schema = { ... }`       | `export const inputSchema = z.object({ ... })` |
   | `export const metadata: ToolMetadata` | Inline in `registerTool()` call                |
   | `export default async function`       | Export named function                          |
   | `headers()` for session               | `extra.sessionId` parameter                    |
   | `InferSchema<typeof schema>`          | `z.infer<typeof inputSchema>`                  |

2. **Update imports** in each tool file:
   - Replace `import { headers } from "xmcp/headers"` with SDK's `RequestHandlerExtra`
   - Replace xmcp types with SDK types

3. **Register tools in server factory**:
   ```typescript
   server.registerTool(
     toolConfig.name,
     {
       title: toolConfig.title,
       description: toolConfig.description,
       inputSchema: toolConfig.inputSchema,
       annotations: toolConfig.annotations,
     },
     toolHandler,
   );
   ```

### Phase 4: HTTP Transport Setup

> **IMPORTANT:** plone-mcp requires **stateful sessions** because PloneClient authentication state must persist per session. Follow the SDK's stateful pattern from `simpleStreamableHttp.ts`.

1. **Create HTTP server entry** (`src/http-server.ts`):

   ```typescript
   import express from "express";
   import { randomUUID } from "node:crypto";
   import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
   import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
   import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
   import { InMemoryEventStore } from "@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js";
   import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
   import { createServer } from "./server.js";

   const app = createMcpExpressApp(); // Includes DNS rebinding protection
   app.use(express.json());

   // Stateful session storage: sessionId -> transport
   const transports: Map<string, StreamableHTTPServerTransport> = new Map();

   // POST handler - main MCP endpoint
   app.post("/mcp", async (req, res) => {
     const sessionId = req.headers["mcp-session-id"] as string | undefined;

     try {
       let transport: StreamableHTTPServerTransport;

       if (sessionId && transports.has(sessionId)) {
         // Reuse existing transport for session
         transport = transports.get(sessionId)!;
       } else if (!sessionId && isInitializeRequest(req.body)) {
         // New session initialization
         const eventStore = new InMemoryEventStore();
         transport = new StreamableHTTPServerTransport({
           sessionIdGenerator: () => randomUUID(),
           eventStore, // Enable resumability
           onsessioninitialized: (sid) => {
             console.log(`Session initialized: ${sid}`);
             transports.set(sid, transport);
           },
         });

         transport.onclose = () => {
           const sid = transport.sessionId;
           if (sid) {
             transports.delete(sid);
             console.log(`Session closed: ${sid}`);
           }
         };

         const server = createServer();
         await server.connect(transport);
       } else {
         res.status(400).json({
           jsonrpc: "2.0",
           error: { code: -32000, message: "Bad Request: No valid session ID" },
           id: null,
         });
         return;
       }

       await transport.handleRequest(req, res, req.body);
     } catch (error) {
       console.error("MCP request error:", error);
       if (!res.headersSent) {
         res.status(500).json({
           jsonrpc: "2.0",
           error: { code: -32603, message: "Internal server error" },
           id: null,
         });
       }
     }
   });

   // GET handler - SSE stream for notifications/resumability
   app.get("/mcp", async (req, res) => {
     const sessionId = req.headers["mcp-session-id"] as string | undefined;
     if (!sessionId || !transports.has(sessionId)) {
       res.status(400).send("Invalid or missing session ID");
       return;
     }
     const transport = transports.get(sessionId)!;
     await transport.handleRequest(req, res);
   });

   // DELETE handler - session termination
   app.delete("/mcp", async (req, res) => {
     const sessionId = req.headers["mcp-session-id"] as string | undefined;
     if (!sessionId || !transports.has(sessionId)) {
       res.status(400).send("Invalid or missing session ID");
       return;
     }
     const transport = transports.get(sessionId)!;
     await transport.handleRequest(req, res);
   });

   app.listen(3001, () => console.log("MCP server listening on port 3001"));

   // Graceful shutdown
   process.on("SIGINT", async () => {
     for (const [sid, transport] of transports) {
       await transport.close();
     }
     process.exit(0);
   });
   ```

### Phase 5: ENABLED_TOOLS Integration

1. **Option A: Middleware approach** (simplest, preserves current behavior)
   - Keep `src/middleware.ts` filtering logic
   - Apply to Express app before route handlers

2. **Option B: Dynamic registration at startup**
   - Read `ENABLED_TOOLS` env var during server startup
   - Only register enabled tools
   - Requires server restart to change enabled tools

3. **Option C: Hybrid**
   - Startup filtering for initial tool set
   - Middleware for runtime filtering (if needed)

### Phase 6: Resource and Prompt Migration

> **Stateful Sessions Required:** plone-mcp MUST use stateful sessions because it stores PloneClient authentication state per session. The session ID from the SDK transport maps to `sessionManager.getSession(sessionId)` which provides the `PloneService` containing the authenticated client.

1. **Resources** (`src/resources/(plone)/*.ts`)
   - Convert xmcp's URI scheme pattern `(plone)/content.ts` → `plone://content`
   - Use SDK's `ResourceTemplate` for dynamic URIs with parameters:

     ```typescript
     import { ResourceTemplate } from "@modelcontextprotocol/sdk/shared/uriTemplate.js";

     server.registerResource(
       "plone-content",
       new ResourceTemplate("plone://content{?path}", {
         list: async () => ({ resources: [] }), // Optional: list available resources
       }),
       {
         title: "Plone Content Item",
         description: "Read-only access to Plone content via path",
         mimeType: "application/json",
       },
       async (uri, variables, extra) => {
         const sessionId = extra.sessionId;
         const service = sessionManager.getSession(sessionId);
         // ...
         return {
           contents: [
             { uri: uri.href, mimeType: "application/json", text: "..." },
           ],
         };
       },
     );
     ```

   - For static URIs, use simple string: `server.registerResource("name", "plone://static", {...}, handler)`

2. **Prompts** (`src/prompts/*.ts`)
   - Convert to SDK `registerPrompt()` pattern
   - Update argument schema handling

### Phase 7: Testing and Build

1. **Update test setup** if needed
2. **Update Dockerfile** for new build process
3. **Update Makefile** commands
4. **Run type checking and fix errors**
5. **Test HTTP server startup**
6. **Test STDIO server**
7. **Verify ENABLED_TOOLS filtering works**

---

## 4. File Changes Summary

### 4.1 Files to Create

| File                              | Purpose                                                            |
| --------------------------------- | ------------------------------------------------------------------ |
| `src/server.ts`                   | Server factory creating McpServer with all tools/resources/prompts |
| `src/http-server.ts`              | HTTP entry point with Express + StreamableHTTPServerTransport      |
| `src/stdio-server.ts`             | STDIO entry point with StdioServerTransport                        |
| `src/utils/inMemoryEventStore.ts` | Copy from SDK examples (for resumability)                          |
| `src/tools/index.ts`              | Export all tools for registration                                  |
| `src/resources/index.ts`          | Export all resources for registration                              |
| `src/prompts/index.ts`            | Export all prompts for registration                                |

### 4.2 Files to Modify

| File                     | Changes                                               |
| ------------------------ | ----------------------------------------------------- |
| `package.json`           | Update dependencies, scripts, add typescript-sdk link |
| `tsconfig.json`          | Update path aliases, module settings                  |
| `src/tools/*.ts`         | Convert tool pattern to SDK                           |
| `src/resources/**/*.ts`  | Convert resources to SDK (use ResourceTemplate)       |
| `src/prompts/*.ts`       | Convert prompts to SDK                                |
| `src/session-manager.ts` | Minor updates for SDK compatibility                   |
| `src/middleware.ts`      | Keep for ENABLED_TOOLS filtering                      |
| `Dockerfile`             | Update build steps                                    |
| `Makefile`               | Update build/test commands                            |

### 4.3 Files to Delete

| File / Folder          | Reason                            |
| ---------------------- | --------------------------------- |
| `xmcp.config.ts`       | No longer used                    |
| `xmcp-env.d.ts`        | No longer used                    |
| `.xmcp/` directory     | Generated by xmcp, not needed     |
| `src/utils/session.ts` | Replaced by SDK's extra.sessionId |

### 4.4 Files to Keep (possibly refactor)

| File                       | Reason                                                 |
| -------------------------- | ------------------------------------------------------ |
| `src/plone-client.ts`      | Plone REST API client - works as-is                    |
| `src/plone-service.ts`     | Session-bound service - needs minor session ID updates |
| `src/block-registry.ts`    | Block type registry - works as-is                      |
| `src/utils/block-utils.ts` | Block utilities - works as-is                          |
| `src/markdown-parser.ts`   | Markdown processing - works as-is                      |

---

## 5. Zod Version Compatibility

The typescript-sdk supports both Zod v3 and v4:

```typescript
// SDK handles this internally via zod-compat.ts
import * as z from "zod/v4"; // v4
// or
import { z } from "zod"; // v3
```

**Current project uses:** Zod v4.0.10

**Action:** Ensure all tool schemas use Zod v4 API. Most existing code should work, but chained `.refine()` on `.optional()` may need adjustment.

---

## 6. Session Management Details

### Current Session Flow

```
Client Request (mcp-session-id header)
    ↓
xmcp HTTP Handler (xmcp/http.js)
    ↓
headers() function → getSessionId() → sessionManager.getSession()
    ↓
PloneService (holds PloneClient + state)
```

### Target Session Flow

```
Client Request (mcp-session-id header)
    ↓
StreamableHTTPServerTransport (handles session creation/lookup)
    ↓
extra.sessionId in tool handler → sessionManager.getSession()
    ↓
PloneService (holds PloneClient + state)
```

### Key Changes

1. **Delete `src/utils/session.ts`** - The `getHeaderValue()` and `getSessionId()` functions are replaced by SDK's `extra.sessionId`
2. Keep `sessionManager` and `PloneService` largely unchanged
3. Session ID comes from `extra.sessionId` instead of `headers()`
4. Transport's `sessionIdGenerator` handles ID creation/lookup
5. Update all tool handlers to use `(args, extra: RequestHandlerExtra)` signature and get sessionId from `extra.sessionId`

---

## 7. ENABLED_TOOLS Implementation Options

> **Note:** Since we create a `new McpServer` per session (stateful pattern), the tools must be filtered at **tool registration time** or via **response filtering**. Middleware filtering works but has overhead per session creation.

### Option A: Response Filtering Middleware (Current Approach - Recommended for Initial Migration)

Keep current `src/middleware.ts` approach with modifications:

```typescript
// Wrap the Express app with middleware BEFORE /mcp route
import { toolsFilterMiddleware } from "./middleware.js";
app.use(toolsFilterMiddleware);
```

The middleware intercepts `tools/list` responses and filters based on `ENABLED_TOOLS`.

**Pros:** Preserves current behavior, no code changes to tool registration
**Cons:** Slight overhead from response interception

### Option B: Registration-Time Filtering (Cleaner but Requires Refactor)

```typescript
// In createServer():
const enabledTools = process.env.ENABLED_TOOLS
  ? new Set(process.env.ENABLED_TOOLS.split(",").map((t) => t.trim()))
  : null;

if (!enabledTools || enabledTools.has("plone_configure")) {
  server.registerTool(
    "plone_configure",
    ploneConfigureConfig,
    ploneConfigureHandler,
  );
}
// ... for each tool
```

**Pros:** Cleaner, no runtime overhead
**Cons:** Requires refactor of tool registration, server restart to change enabled tools

### Recommendation

Use **Option A** for initial migration to minimize changes, then consider **Option B** in a follow-up refactor.

---

## 8. Testing Checklist

- [ ] HTTP server starts on correct port
- [ ] STDIO server works when invoked as CLI
- [ ] Session ID is properly maintained across requests
- [ ] `plone_configure` tool works (creates PloneClient, stores in session)
- [ ] All other tools work with configured PloneClient
- [ ] ENABLED_TOOLS filtering works (if implemented)
- [ ] Resources are listed and readable
- [ ] Prompts are listed and return correct messages
- [ ] Error handling works correctly
- [ ] Docker build succeeds
- [ ] Type checking passes

---

## 9. Potential Issues and Mitigations

| Issue                      | Mitigation                                              |
| -------------------------- | ------------------------------------------------------- |
| Zod v4 API differences     | Review chained `.refine()` usage, test thoroughly       |
| xmcp's `headers()` global  | Replace with `extra.sessionId` and direct header access |
| Import map auto-generation | Manually register tools in server factory               |
| Build output structure     | Update Dockerfile and Makefile for new structure        |
| Path aliases in tsconfig   | Update to point to correct source directories           |

---

## 10. Implementation Order

1. Update `package.json` with new dependencies
2. Create `src/server.ts` factory with one test tool
3. Create `src/http-server.ts` with basic Express setup
4. Verify HTTP transport works
5. Migrate `plone_configure` tool (critical for all others)
6. Migrate remaining tools one by one
7. Migrate resources
8. Migrate prompts
9. Implement ENABLED_TOOLS filtering
10. Update Dockerfile and Makefile
11. Full testing

---

## Appendix: SDK Key Imports

```typescript
// Server
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

// Transports
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Express helper with DNS rebinding protection
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";

// Event store for resumability (create from example or implement own)
// Note: Copy from typescript-sdk/src/examples/shared/inMemoryEventStore.ts
import { InMemoryEventStore } from "./inMemoryEventStore.js";

// Types
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  CallToolResult,
  ReadResourceResult,
  GetPromptResult,
} from "@modelcontextprotocol/sdk/types.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

// Resource template
import { ResourceTemplate } from "@modelcontextprotocol/sdk/shared/uriTemplate.js";

// Utilities
import { randomUUID } from "node:crypto";
```

### Required SDK Files to Copy

The `InMemoryEventStore` is not exported from the SDK package. You need to copy it:

```bash
cp typescript-sdk/src/examples/shared/inMemoryEventStore.ts src/utils/inMemoryEventStore.ts
```

Or implement your own event store using the `EventStore` interface from the SDK.

---

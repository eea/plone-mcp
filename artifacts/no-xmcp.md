# Migration Plan: xmcp → @modelcontextprotocol/sdk

## Overview

This document outlines the migration path from the current `xmcp`-based implementation to the official `@modelcontextprotocol/sdk`. The goal is to deploy the `plone-mcp` server as a standalone HTTP and STDIO server using the official SDK, while maintaining **stateful sessions** for authentication persistence.

### Critical Architecture Decision: Stateful Sessions

**plone-mcp MUST use stateful sessions** because:

1.  `PloneClient` stores authentication state (base URL, token/credentials).
2.  This state must persist across multiple tool calls within a session.
3.  Each session has its own `PloneService` instance in `sessionManager`.

The SDK pattern we follow is from `simpleStreamableHttp.ts` (stateful):
-   One `McpServer` instance per session.
-   Transport stored in `Map<sessionId, Transport>`.
-   `sessionManager` maps `sessionId` to `PloneService`.

---

## Phase 1: Project Setup & Dependencies

### 1.1 Update `package.json`

**Action:** Update dependencies and scripts. Remove `xmcp`.

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/http-server.js",
    "stdio": "node dist/stdio-server.js",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "file:./typescript-sdk",
    "express": "^4.19.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/express": "^4.17.21"
  }
}
```

### 1.2 Update `tsconfig.json`

**Action:** Remove `xmcp` path aliases and ensure ESM compatibility.

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "baseUrl": ".",
    "paths": {
      "plone-mcp/*": ["src/*"]
    }
  }
}
```

---

## Phase 2: Core Server Implementation

### 2.1 Create Server Factory (`src/server.ts`)

**Action:** Centralize tool, resource, and prompt registration.

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools/index.js";
import { registerResources } from "./resources/index.js";
import { registerPrompts } from "./prompts/index.js";

export function createServer() {
  const server = new McpServer({
    name: "plone-mcp-server",
    version: "1.0.0",
  });

  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}
```

### 2.2 Create Registry Indices

**Action:** Create `index.ts` files in `tools/`, `resources/`, and `prompts/` to handle bulk registration.

Example `src/tools/index.ts`:
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ploneConfigure } from "./plone_configure.js";
// ... other imports

export function registerTools(server: McpServer) {
  server.registerTool(
    ploneConfigure.config.name,
    ploneConfigure.config.description,
    ploneConfigure.config.inputSchema,
    ploneConfigure.handler
  );
  // ... register others
}
```

---

## Phase 3: Tool Migration Template

### 3.1 Migration Pattern (Before vs. After)

**Before (`xmcp` style):**
```typescript
import { headers } from "xmcp/headers";
export const schema = { baseUrl: z.string()... };
export const metadata = { name: "plone_configure", ... };
export default async function ploneConfigure(args) {
  const sessionId = getSessionId(headers());
  const service = sessionManager.getSession(sessionId);
  // ...
}
```

**After (SDK style):**
```typescript
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { z } from "zod";

const inputSchema = z.object({
  baseUrl: z.string().describe("..."),
});

export const ploneConfigure = {
  config: {
    name: "plone_configure",
    description: "...",
    inputSchema,
  },
  handler: async (args: z.infer<typeof inputSchema>, extra: RequestHandlerExtra) => {
    const sessionId = extra.sessionId; // Provided by SDK
    const service = sessionManager.getSession(sessionId);
    // ... implementation
  }
};
```

### 3.2 Key Changes in Tools
-   **Session ID:** Replace `import { headers } from "xmcp/headers"` with `extra.sessionId`.
-   **Schema:** Convert schema objects to `z.object({...})`.
-   **Types:** Remove `xmcp` type imports (`InferSchema`, `ToolMetadata`).
-   **Zod:** Prefer standard `zod` import.

---

## Phase 4: HTTP & STDIO Entry Points

### 4.1 Stateful HTTP Server (`src/http-server.ts`)

**Action:** Implement stateful session management using Express. Use `createMcpExpressApp` for security.

```typescript
import express from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { createServer } from "./server.js";

const app = createMcpExpressApp();
app.use(express.json());

// Session storage: sessionId -> transport
const transports = new Map<string, StreamableHTTPServerTransport>();

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string;
  let transport = transports.get(sessionId);

  // Initialize a new session if not found and it's an initialize request
  if (!transport && req.body.method === "initialize") {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        console.log(`Session initialized: ${sid}`);
        transports.set(sid, transport!);
      },
    });
    
    transport.onclose = () => {
      const sid = transport!.sessionId;
      if (sid) transports.delete(sid);
    };

    const server = createServer();
    await server.connect(transport);
  }

  if (transport) {
    await transport.handleRequest(req, res, req.body);
  } else {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Invalid or missing session ID" },
      id: null
    });
  }
});

// SSE endpoint for notifications/stream
app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string;
  const transport = transports.get(sessionId);
  if (transport) {
    await transport.handleRequest(req, res);
  } else {
    res.status(400).send("Invalid Session");
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`HTTP MCP Server running on port ${PORT}`));
```

### 4.2 STDIO Server (`src/stdio-server.ts`)

```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const server = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("STDIO MCP Server started");
```

---

## Phase 5: Directory Structure After Migration

To help navigate the new architecture:

```text
plone-mcp/
├── src/
│   ├── server.ts          # Server factory (McpServer)
│   ├── http-server.ts     # HTTP entry point (Express)
│   ├── stdio-server.ts    # STDIO entry point
│   ├── tools/
│   │   ├── index.ts       # Registry for all tools
│   │   └── plone_*.ts     # Migrated tool implementations
│   ├── resources/
│   │   ├── index.ts       # Registry for all resources
│   │   └── *.ts           # Migrated resource implementations
│   └── prompts/
│       ├── index.ts       # Registry for all prompts
│       └── *.ts           # Migrated prompt implementations
├── typescript-sdk/        # Local SDK clone
├── package.json           # Updated scripts/deps
└── tsconfig.json          # Updated ESM/path settings
```

---

## Phase 6: ENABLED_TOOLS Filtering

To maintain the current behavior of `ENABLED_TOOLS` environment variable:

1.  **Option A (Registration-time):** In `registerTools(server)`, check `process.env.ENABLED_TOOLS` and only call `server.registerTool` for allowed tools.
2.  **Option B (Middleware):** Use the existing `src/middleware.ts` logic but adapted for Express.

**Recommendation:** Use Option A for simplicity and performance.

---

## Phase 8: Testing Strategy

The migration requires updating the test suite to match the new SDK-based signatures and remove `xmcp` dependencies.

### 8.1 Update Test Setup (`__tests__/setup.ts`)

**Action:** Remove `xmcp/headers` mock.

```typescript
// Remove this:
// vi.mock("xmcp/headers", () => ...)
```

### 8.2 Tool Integration Tests

**Action:** Update tool calls to include the `extra` argument (mocked).

**Before:**
```typescript
const result = await ploneConfigure(args);
```

**After:**
```typescript
const mockExtra = {
  sessionId: "test-session-id",
  signal: new AbortController().signal,
  requestId: "test-request-id",
} as any;

const result = await ploneConfigure.handler(args, mockExtra);
```

### 8.3 Key Changes in Tests
-   **Types:** Replace `InferSchema<typeof schema>` with `z.infer<typeof inputSchema>`.
-   **Mocks:** Remove all references to `xmcp` mocks.
-   **Direct Handler Testing:** Import the named export (e.g., `ploneConfigure`) and call its `.handler` directly.

---

## Phase 9: Final Verification & Cleanup

### 9.1 Verification Checklist
-   [ ] **Type Check:** `pnpm run type-check` passes.
-   [ ] **Unit Tests:** `pnpm test` (vitest) passes for all migrated tools.
-   [ ] **Initialize:** `curl -X POST http://localhost:3001/mcp -d '{"jsonrpc":"2.0","method":"initialize","params":{...},"id":1}'`
-   [ ] **Tool Call:** Call `plone_configure` with session ID header and verify `PloneClient` is stored.
-   [ ] **Persistence:** Call `plone_get_site_info` and verify it uses the authenticated client from the same session.

### 9.2 Cleanup
-   [ ] Delete `xmcp.config.ts`, `xmcp-env.d.ts`, and `.xmcp/` directory.
-   [ ] Delete `src/utils/session.ts` (replaced by `extra.sessionId`).
-   [ ] Update `README.md` and `Dockerfile`.

---

## Common Gotchas

1.  **ESM Imports:** Ensure all local imports include the `.js` extension (e.g., `import { x } from "./utils.js"`).
2.  **Zod Versions:** Ensure all tools use the same Zod version as the SDK.
3.  **Express Headers:** Express lowercases header names automatically; ensure `mcp-session-id` lookup is case-insensitive.

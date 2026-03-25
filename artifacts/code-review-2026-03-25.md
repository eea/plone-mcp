# Code Quality Review: Plone MCP Server

**Branch:** eea  
**Date:** 2026-03-25  
**Reviewer:** Automated Code Review

---

## Executive Summary

This is a well-architected MCP (Model Context Protocol) server that enables AI assistants to interact with Plone CMS via REST API. The codebase demonstrates solid engineering practices with a clear separation of concerns, comprehensive test coverage, and thoughtful error handling. Overall quality is **high**,with a few areas warranting attention.

**Key Strengths:**

- Clean modular architecture with clear separation of concerns
- Comprehensive test coverage (unit + integration tests)
- Well-documented API with helpful descriptions
- Robust session management for stateful operations
- Flexible authentication (Basic Auth + JWT)

**Areas for Improvement:**

- Session memory management concerns for long-running servers
- Missing input validation in some areas
- Inconsistent error handling patterns
- Limited logging/observability

---

## Architecture Assessment

### Overall Design: Excellent

The architecture follows a clean three-tier pattern:

```
Entry Points (HTTP/STDIO)→ Server Factory (createServer)
     → Components (Tools, Resources, Prompts)
         → Service Layer (PloneService)
             → HTTP Client (PloneClient)
```

**Strengths:**

1. **Modular Tool Registry Pattern** (`src/tools/index.ts:27-68`): The tool registration with `ENABLED_TOOLS` filtering is elegant and allows for deployment-specific configurations. Tools are self-contained with config and handler collocated.2. **Session Management** (`src/session-manager.ts`): The singleton pattern with per-session PloneService instances correctly handles the stateful nature of MCP sessions.

2. **Dual Transport Support**: Supporting both HTTP and STDIO transports makes the server flexible for different deployment scenarios (Claude Desktop vs. HTTP/SSE clients).

3. **Service Layer Abstraction** (`src/plone-service.ts`): The `PloneService` class properly encapsulates client state and prepared blocks with TTL management, providing a clean API for tool handlers.

**Concerns:**

1. **Unbounded Session Map** (`src/session-manager.ts:4`): Sessions are stored in a `Map` with no eviction policy. Long-running servers will accumulate sessions until memory exhaustion.

```typescript
// Current: No cleanup mechanism
private sessions: Map<string, PloneService> = new Map<string, PloneService>();
```

**Recommendation:** Add session TTL or implement a cleanup mechanism when `close()` is called:

```typescript
// In http-server.ts, the session cleanup happens but SessionManager doesn't expose clearSession
// The DELETE handler calls transport.close() but SessionManager is never notified
```

2. **Prepared Blocks TTL** (`src/plone-service.ts:13`): 60-second TTL is hardcoded. This should be configurable via environment variable.

---

## Code Quality Analysis

### Type Safety: Good

TypeScript configuration is strict (`tsconfig.json`):

- `strict: true`, `noImplicitAny: true`
- `forceConsistentCasingInFileNames: true`
- ES2022 target with NodeNext modules

The codebase uses Zod schemas for runtime validation, providing both type safety and input validation.

### Error Handling: Mixed Patterns

**Good Pattern** (`src/utils/block-utils.ts:21-28`):

```typescript
export function wrapError(operation: string, error: unknown): Error {
  if (error instanceof z.ZodError) {
    return new Error(`[${operation}] Invalid parameters: ${error.message}`);
  }
  return new Error(
    `[${operation}] ${error instanceof Error ? error.message : String(error)}`,
  );
}
```

This provides consistent error wrapping with operation context.

**Inconsistency** (`src/resources/content.ts:40-46`):

```typescript
catch (error: unknown) {
  throw new Error(
    `Failed to fetch content at "${normalizedPath}": ${
      error instanceof Error ? error.message : String(error)
    }`
  );
}
```

Resources use inline error handling instead of the `wrapError` utility.

**Missing Error Context** (`src/http-server.ts:67-74`):

```typescript
catch (error) {
  console.error("MCP request error:", error);
  // Error details are logged but not returned to client
}
```

**Recommendation:** Standardize on `wrapError` across all handlers and consider structured logging with request IDs.

### Code Organization: Excellent

- **Single Responsibility**: Each tool file handles one operation
- **Consistent Patterns**: All tools follow the same `config` + `handler` structure
- **Clear Naming**: Files and functions are self-documenting

**Example Structure** (`src/tools/plone_configure.ts`):

```typescript
const inputSchema = z.object({ ... });

export const ploneConfigure = {
  config: {
    name: "plone_configure",
    description: "...",
    inputSchema,
  },
  handler: async (args, extra) => { ... },
};
```

### Input Validation: Goodwith Gaps

Zod schemas validate tool inputs at the MCP layer. However:

**Gap** (`src/plone-client.ts:135-143`):

```typescript
normalizePath(path: string): string {
  if (!path || path === "/") return "";
  let normalized = path.replace(/\/$/, "");
  if (!normalized.startsWith("/") && normalized !== "") {
    normalized = `/${normalized}`;
  }
  return normalized;
}
```

Path normalization is defensive but doesn't prevent directory traversal (`../../../etc/passwd`). While Plone'sAPI would catch this, client-side validation would be faster.

### Null/Undefined Handling: Good

The codebase handles null/undefined cases appropriately:

**Example** (`src/plone-service.ts:19-26`):

```typescript
public getClient(): PloneClient {
  if (!this.client) {
    throw new Error(
      "Plone client not configured. Please run plone_configure first.",
    );
  }
  return this.client;
}
```

---

## Security Assessment

### Authentication: Good

- Supports both Basic Auth and JWT token authentication
- Credentials are accepted via arguments OR environment variables
- Arguments take precedence over environment variables (correct priority)
- Connection is validated during `plone_configure` before marking session as configured

**Minor Concern** (`src/plone-client.ts:114-131`): Auth headers are set on axios instance creation and persist. For JWT tokens with expiration, there's no refresh mechanism.

### Secrets Handling: Acceptable

- Passwords/tokens are never logged
- Environment variables are standard practice
- No hardcoded credentials in codebase

**Note:** JWT tokens are stored in memory (`PloneClient.token`) and could appear in heap dumps. Consider documenting this for production deployments.

### Path Traversal: Partially Mitigated

The `normalizePath` function cleans paths but doesn't explicitly reject traversal patterns. Plone's server-side validation is the primary defense. Consider adding:

```typescript
if (path.includes("..")) {
  throw new Error("Path traversal not allowed");
}
```

---

## Performance Considerations

### HTTP Client: Efficient

The `PloneClient` uses a single axios instance per session, enabling connection pooling and keep-alive by default.

### Block Processing: Potential Bottleneck

In `src/utils/block-utils.ts`, the `validateImageURL` function makes synchronous HEAD requests:

```typescript
export async function validateImageURL(url: string): Promise<boolean> {
  // ...
  const response = await fetch(url, { method: "HEAD" ...});
  // ...
}
```

This function exists but I didn't find it being called in the block processors. If used, it would add latency. The block processors correctly don't validate URLs synchronously.

### Markdown Parsing: Good

The unified/remark pipeline in `src/markdown-parser.ts` is appropriate for the use case. No performance concerns for typical content sizes.

---

## Testing Assessment

### Coverage: Comprehensive

**Test Structure:**

- 7 unit test files
- 20 integration test files
- Dedicated test helpers (`PloneMockServer` class)
- Proper setup/teardown with nock

**Test Quality: Good**

Tests cover:

- Happy paths
- Error cases(401, invalid URLs, missing config)
- Environment variable fallbacks
- Session management

**Example** (`__tests__/integration/plone_configure.test.ts:127-160`): Tests argument precedence over environment variables - a critical behavioral contract.

**Gaps:**

- No tests for HTTP server (`http-server.ts`)
- No tests for STDIO server (`stdio-server.ts`)
- No tests for resources (`src/resources/`)
- No tests for prompts (`src/prompts/`)

### Mock Strategy: Appropriate

Using `nock` for HTTP mocking is the right choice for this codebase. The `PloneMockServer` helper provides a clean API for test authors.

---

## Maintainability

### Documentation: Excellent

- Comprehensive README with examples
- PROJECT.MD for AI agents
- TESTING.md guide
- Inline code comments where needed
- Tool descriptions are detailed andinclude usage examples

### Dependencies: Well-Managed

**Production Dependencies** (`package.json`):

- `@modelcontextprotocol/sdk` - Official MCP SDK
- `axios` - Standard HTTP client
- `zod` - Schema validation
- `express` + `@hono/node-server` + `hono` - HTTP framework diversity (see concern)
- `unified`, `remark-*` - Markdown processing

**Concern:** Three HTTP frameworks (Express, Hono, @hono/node-server). The code uses Express for HTTP server but imports from hono. Investigate if all are needed.

### Code Style: Consistent

- ESLint strict + stylistic configs
- Import ordering enforced
- Prettier for formatting
- TypeScript strict mode

---

## Specific Issues

### High Priority

1. **Session Memory Leak** (`src/session-manager.ts`): Sessions are never cleaned up except on server shutdown. For long-running servers, implement:
   - Session TTL with periodic cleanup
   - Explicit `clearSession` calls from HTTP transport `onclose`

2. **Missing Transport Lifetime Integration** (`src/http-server.ts:46-52`):
   ````typescript
   transport.onclose = () => {
     const sid = transport.sessionId;
     if (sid) {
       transports.delete(sid);
       console.log(`Session closed: ${sid}`);       // SessionManager is NOT notified!
     }
   };
   ```**Fix:** Call `sessionManager.clearSession(sid)` in the `onclose` handler.
   ````

### Medium Priority

3. **Hardcoded TTL** (`src/plone-service.ts:13`): Make `PREPARED_BLOCKS_TTL` configurable.

4. **Inconsistent Error Handling**: Resources don't use `wrapError`. Standardize across all handlers.

5. **Unused HTTP Framework Imports**: The package includes both Express and Hono frameworks but the HTTP server uses Express. Verify intent.

### Low Priority

6. **Missing Tests**:
   - HTTP server session management
   - STDIO server
   - Resource handlers
   - Prompt handlers

7. **Logging**: `console.log`/`console.error` used throughout. Consider structured logging for production.

8. **Type Narrowing** (`src/utils/block-utils.ts:88-91`):
   ```typescript
   const layoutItems = (blocks_layout as { items?: string[] } | undefined)
     ?.items;
   ```
   Type casting could be avoided with proper Zod schema validation.

---

## Metrics Summary

| Metric                 | Value                  |
| ---------------------- | ---------------------- |
| Source Files           | 39 TypeScript files    |
| Total Lines            | ~6,200 LOC             |
| Test Files             | 27 files               |
| Test Coverage          | Unit + Integration     |
| Dependencies           | 13 production, 20+ dev |
| TypeScript Strict Mode | Enabled                |
| ESLint Rules           | Strict + Stylistic     |

---

## Recommendations

### Immediate Actions

1. **Fix Session Cleanup**: In `http-server.ts`, add `sessionManager.clearSession(sid)` to the transport `onclose` handler.

2. **Document Memory Model**: Add documentation about session lifetime and memory implications.

### Short-term Improvements

3. **Standardize Error Handling**: Create a base error class or use `wrapError` consistently.

4. **Add Integration Tests**: For HTTP server session lifecycle.

5. **Make TTL Configurable**: Environment variable for prepared blocks timeout.

### Long-term Enhancements

6. **Add Structured Logging**: Replace `console.*` with a logger that supports levels and JSON output.

7. **Consider Session Store**: Forproduction deployments, allow external session storage (Redis) for horizontal scaling.

8. **Path Validation**: Add client-side path traversal prevention.

---

## Conclusion

This is a well-designed MCP server implementation with solid architecture and comprehensive functionality. The codebase demonstrates good TypeScript practices, appropriate separation of concerns, and thorough testing for the core business logic. The main concerns are around production-readiness for long-running deployments (session cleanup) and consistency in error handling. These are addressable with targeted fixes rather than architectural changes.

**Overall Grade: B+**

The codebase is production-ready for controlled environments (fixed session counts) with minor fixes. For high-scale production deployments, session management improvements should be prioritized.

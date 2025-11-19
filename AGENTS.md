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

@/home/tibi/.gemini/AGENTS.md
<!-- Warning: Referenced file '../../../../home/tibi/.gemini/AGENTS.md' is outside the project and was ignored. -->

<!-- Imported from: README.md -->
# Plone MCP Server

A Model Context Protocol (MCP) server for integrating MCP clients with Plone CMS via REST API. Enables content management, search, workflow operations, and Volto blocks management.

## Prerequisites

- **Node.js 18+** - Required to run the server (install: `brew install node` on macOS or from [nodejs.org](https://nodejs.org))
- **pnpm 8+** - Package manager (install: `npm install -g pnpm` or `brew install pnpm` on macOS)
- **Plone 6.0+** site with REST API - The CMS you'll be connecting to

## Quick Start using Claude Desktop as an example

1. **Install**
```bash
git clone git@github.com:plone/plone-mcp.git
cd plone-mcp
pnpm install
pnpm run build
```

2. **Configure Claude Desktop**

Add to Claude's configuration file:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**With environment variables (optional):**
```json
{
  "mcpServers": {
    "plone": {
      "command": "node",
      "args": ["/absolute/path/to/plone-mcp/dist/index.js"],
      "env": {
        "PLONE_BASE_URL": "https://demo.plone.org",
        "PLONE_USERNAME": "admin",
        "PLONE_PASSWORD": "admin",
        "ENABLED_TOOLS": "plone_get_content,plone_create_content"
      }
    }
  }
}
```

**Without environment variables:**
```json
{
  "mcpServers": {
    "plone": {
      "command": "node",
      "args": ["/absolute/path/to/plone-mcp/dist/index.js"]
    }
  }
}
```

3. **Restart Claude Desktop**

4. **Connect to Plone**

Call `plone_configure` once per session:

```javascript
// Using environment variables
plone_configure({})

// OR providing credentials/token directly to the LLM
plone_configure({
  "baseUrl": "https://demo.plone.org",
  "username": "admin",
  "password": "admin"
})

plone_configure({
  "baseUrl": "https://demo.plone.org",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
})
```

**Note:** Arguments take precedence over environment variables.

## Core Features

- **Content Management**: CRUD operations on all Plone content types
- **Block System**: Create and manage Volto blocks
- **Search**: Full-text search with filtering and sorting
- **Workflow**: Manage publication states and transitions
- **Site Info**: Access content types, vocabularies, and site configuration

## Available Tools

This section provides a comprehensive list of all tools available in the Plone MCP server, along with their descriptions and example usage.

### Configuration

*   **`plone_configure`**
    *   **Description:** Establishes and authenticates the connection to a Plone CMS. **Must be called once per session** before other tools can be used. Configuration can be provided via arguments or environment variables (PLONE_BASE_URL, PLONE_USERNAME, PLONE_PASSWORD, PLONE_TOKEN). Arguments take precedence over environment variables. To use environment variables only, call with an empty object: `plone_configure({})`.
    *   **Example:**
        ```javascript
        plone_configure({baseUrl: 'https://demo.plone.org', username: 'admin', password: 'secret'})
        ```

### Content Management

*   **`plone_get_content`**
    *   **Description:** Retrieves the full JSON data for a single content item from Plone using its path.
    *   **Example:**
        ```javascript
        plone_get_content({path: '/news/latest-update'})
        ```
*   **`plone_create_content`**
    *   **Description:** Creates a new content item (e.g., a page or news article) in Plone. To add complex block-based content, first prepare the structure with `plone_create_blocks_layout`, then call this tool.
    *   **Example:**
        ```javascript
        plone_create_content({parentPath: '/', type: 'Document', title: 'My Page', description: 'A sample page'})
        ```
*   **`plone_update_content`**
    *   **Description:** Modifies an existing content item in Plone. Can update metadata (like title) and/or replace the entire block structure. Use `plone_create_blocks_layout` to prepare complex block updates.
    *   **Example:**
        ```javascript
        plone_update_content({path: '/my-page', title: 'Updated Title'})
        ```
*   **`plone_delete_content`**
    *   **Description:** Permanently deletes a content item from Plone using its path.
    *   **Example:**
        ```javascript
        plone_delete_content({path: '/old-content'})
        ```

### Search and Discovery

*   **`plone_search`**
    *   **Description:** Performs a detailed search for content items, allowing filters by text, content type, path, and workflow state.
    *   **Example:**
        ```javascript
        plone_search({query: 'annual report', portal_type: ['Document'], review_state: ['published']})
        ```
*   **`plone_get_site_info`**
    *   **Description:** Retrieves top-level information and metadata about the connected Plone site, such as available languages and Plone version.
    *   **Example:**
        ```javascript
        plone_get_site_info({})
        ```
*   **`plone_get_types`**
    *   **Description:** Lists all available content types that can be created in the Plone site (e.g., 'Document', 'Event').
    *   **Example:**
        ```javascript
        plone_get_types({})
        ```
*   **`plone_get_vocabularies`**
    *   **Description:** Fetches the allowed values for a specific field, such as a list of categories or tags. Useful for finding valid inputs for content fields.
    *   **Example:**
        ```javascript
        plone_get_vocabularies({vocabulary: 'plone.app.vocabularies.Keywords'})
        ```

### Workflow Management

*   **`plone_get_workflow_info`**
    *   **Description:** Shows the current workflow state (e.g., 'Published', 'Private') and available transitions for a content item.
    *   **Example:**
        ```javascript
        plone_get_workflow_info({path: '/my-document'})
        ```
*   **`plone_transition_workflow`**
    *   **Description:** Changes the workflow state of a content item by executing a specific transition, like 'publish' or 'submit'.
    *   **Example:**
        ```javascript
        plone_transition_workflow({path: '/my-document', transition: 'publish'})
        ```

### Block Management

*   **`plone_get_block_schemas`**
    *   **Description:** Lists all available Volto block types (e.g., 'slate', 'teaser', 'button') and their required data schemas. **Essential for understanding how to construct blocks.**
    *   **Example:**
        ```javascript
        plone_get_block_schemas({blockType: 'teaser'})
        ```
*   **`plone_create_blocks_layout`**
    *   **Description:** Prepares a complete block structure in memory (valid for 60 seconds). This structure is then used by the **next immediate call** to `plone_create_content` or `plone_update_content`. Use `plone_get_block_schemas` to learn what data each block type needs. The text displayed by the Title block is automatically managed by Plone, DO NOT add it in the block's data.
    *   **Example:**
        ```javascript
        plone_create_blocks_layout({blocks: [{type: 'title'},{type: 'slate', data: {text: 'Hello World'}}]})
        ```
*   **`plone_add_single_block`**
    *   **Description:** Adds a single new block to an existing content item without replacing other blocks. Specify the block type, data, and optional position.
    *   **Example:**
        ```javascript
        plone_add_single_block({path: '/my-page', blockType: 'text', blockData: {text: 'New paragraph'}})
        ```
*   **`plone_update_single_block`**
    *   **Description:** Modifies the data of a single, existing block within a content item, identified by its block ID.
    *   **Example:**
        ```javascript
        plone_update_single_block({path: '/my-page', blockId: 'abc123', blockData: {text: 'Updated text'}})
        ```
*   **`plone_remove_single_block`**
    *   **Description:** Deletes a single block from a content item, identified by its block ID.
    *   **Example:**
        ```javascript
        plone_remove_single_block({path: '/my-page', blockId: 'abc123'})
        ```

## Block Management

### Creating Content with Blocks

```javascript
// 1. Prepare blocks (60-second TTL - meant to be used inmediatly before content creation/editing)
plone_create_blocks_layout({
  "blocks": [
    {
      "type": "text",
      "data": {"text": "Welcome to our site!"}
    },
    {
      "type": "teaser",
      "data": {
        "href": "/about",
        "title": "Learn More",
        "description": "Discover what we do"
      }
    }
  ]
})

// 2. Create content (within 60 seconds), the previously prepared blocks will automatically be included in the request
plone_create_content({
  "parentPath": "/",
  "type": "Document",
  "title": "Homepage"
})
```

### Managing Individual Blocks

```javascript
// Add a single block
plone_add_single_block({
  "path": "/homepage",
  "blockType": "text",
  "blockData": {"text": "New paragraph"},
  "position": 1
})

// Update a block
plone_update_single_block({
  "path": "/homepage",
  "blockId": "51176ead-7b59-402d-9412-baed46821b36",  // Get ID from plone_get_content
  "blockData": {"text": "Updated text"}
})

// Remove a block
plone_remove_single_block({
  "path": "/homepage",
  "blockId": "51176ead-7b59-402d-9412-baed46821b36"
})
```

## Available Block Types

- **text**: Rich text content
- **teaser**: Link preview card with image
- **__button**: Call-to-action button
- **separator**: Visual divider line

Use `plone_get_block_schemas()` to see all block types and their properties.

## Common Workflows

### Create and Publish a Page

```javascript
// Configure connection
plone_configure({baseUrl: "https://mysite.com", username: "editor", password: "secret"})

// Create with blocks
plone_create_blocks_layout({
  "blocks": [{"type": "text", "data": {"text": "Article content..."}}]
})
plone_create_content({
  "parentPath": "/news",
  "type": "News Item",
  "title": "Breaking News"
})

// Publish
plone_transition_workflow({
  "path": "/news/breaking-news",
  "transition": "publish"
})
```

### Search and Filter

```javascript
plone_search({
  "query": "annual report",
  "portal_type": ["Document", "File"],
  "review_state": ["published"],
  "sort_on": "modified",
  "sort_order": "descending",
  "b_size": 10
})
```

## Important Notes

⚠️ **Prepared blocks expire after 60 seconds** - Always call `plone_create_blocks_layout` immediately before creating/updating content.

⚠️ **Configure once per session** - Run `plone_configure` once at the start of each session before using other tools. Once configured, you can use all other tools without reconfiguring. The `plone_configure` tool is always enabled and does not require explicit enabling via `ENABLED_TOOLS`.

## Environment Variables

The following environment variables can be used to configure the Plone MCP server:

*   **`PLONE_BASE_URL`**: The base URL of your Plone site (e.g., `https://demo.plone.org`).
*   **`PLONE_USERNAME`**: The username for authenticating with the Plone site.
*   **`PLONE_PASSWORD`**: The password for the specified username.
*   **`PLONE_TOKEN`**: A JWT token for authentication (alternative to username/password).
*   **`ENABLED_TOOLS`**: (Optional) A comma-separated list of tool names to explicitly enable (e.g., `plone_get_content,plone_create_content`). If this variable is not set, all tools (except `plone_configure`, which is always enabled) will be available by default.

## Development

```bash
# Development mode with hot reload
pnpm run dev

# Test with MCP Inspector
pnpm run inspector

# Build for production
pnpm run build
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Plone client not configured" | Run `plone_configure` once at the start of your session |
| "Block not found" | Use `plone_get_content` to get valid block IDs |
| Connection errors | Verify Plone URL and credentials are correct |
| Blocks not applied | Call `plone_create_blocks_layout` immediately before create/update (60s TTL) |
| TypeScript errors during build | Run `pnpm install` to ensure all dependencies are installed |

## Resources

- [Plone REST API Documentation](https://plonerestapi.readthedocs.io/)
- [MCP Documentation](https://modelcontextprotocol.io/docs)

## License

MIT
<!-- End of import from: README.md -->
<!-- Imported from: TESTING.md -->
# Testing Guide for Plone MCP Server

This document describes the comprehensive testing strategy for the Plone MCP server.

## Test Structure

```
tests/
├── setup.ts                    # Global test configuration
├── utils/
│   └── test-helpers.ts         # Test utilities and mocks
├── unit/                       # Unit tests
│   ├── plone-client.test.ts    # PloneClient class tests
│   └── blocks.test.ts          # Block creation logic tests
├── integration/                # Integration tests with mocked APIs
│   └── mcp-server.test.ts      # Full MCP server integration tests
├── functional/                 # Tests against live Plone instances
│   └── live-plone.test.ts      # Real Plone integration tests
└── performance/                # Performance and load tests
    └── load-test.test.ts       # Memory and performance benchmarks
```

## Running Tests

### All Tests

```bash
npm test
```

### By Category

```bash
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:functional    # Functional tests only
```

### Development

```bash
npm run test:watch         # Watch mode for development
npm run test:coverage      # Run with coverage report
```

## Test Types

### 1. Unit Tests

- Test individual functions and methods in isolation
- Mock external dependencies
- Fast execution (< 100ms per test)
- High code coverage

**Example:**

```typescript
describe("generateBlockId", () => {
  it("should generate unique block IDs", () => {
    const server = new PloneMCPServer();
    const id1 = server["generateBlockId"]();
    const id2 = server["generateBlockId"]();

    expect(id1).toMatch(/^block-[a-z0-9]{9}$/);
    expect(id2).not.toBe(id1);
  });
});
```

### 2. Integration Tests

- Test component interactions with mocked Plone API
- Verify request/response handling
- Test error scenarios

**Example:**

```typescript
it("should create blocks content successfully", async () => {
  const mockServer = new PloneMockServer();
  mockServer.mockContentCreate("/", expect.any(Object), mockResponse);

  const result = await server["handleCreateBlocksContent"](testData);
  expect(result.content[0].text).toContain("Test Document");
});
```

### 3. Functional Tests

- Test against real Plone instances
- End-to-end workflow validation
- Requires live Plone environment

**Setup:**

```bash
export PLONE_TEST_URL="https://your-plone-site.com"
export PLONE_TEST_USER="admin"
export PLONE_TEST_PASS="password"
```

### 4. Performance Tests

- Memory usage validation
- Response time benchmarks
- Concurrent operation testing

## Mock Helpers

The `PloneMockServer` class provides easy mocking of Plone API responses:

```typescript
const mockServer = new PloneMockServer("https://test.plone.com");

// Mock different endpoints
mockServer.mockSiteRoot();
mockServer.mockContentGet("/document", sampleDocument);
mockServer.mockSearch({ query: "test" }, sampleSearchResults);
```

## Test Configuration

### Environment Variables

- `PLONE_TEST_URL`: URL for functional tests
- `PLONE_TEST_USER`: Username for functional tests
- `PLONE_TEST_PASS`: Password for functional tests
- `NODE_ENV=test`: Automatically set during test runs

### Jest Configuration

- TypeScript support with ts-jest
- ESM module support
- Coverage collection from `src/` directory
- 30-second timeout for integration tests

## Continuous Integration

Tests run automatically on:

- Every push to `main` and `develop` branches
- All pull requests to `main`
- Multiple Node.js versions (18, 20, 22)

### Coverage Reports

- Minimum 80% code coverage required
- Reports uploaded to Codecov
- HTML reports generated in `coverage/` directory

## Writing New Tests

### Unit Test Checklist

- [ ] Test happy path scenarios
- [ ] Test error conditions
- [ ] Mock external dependencies
- [ ] Verify input validation
- [ ] Check return values

### Integration Test Checklist

- [ ] Mock HTTP responses
- [ ] Test authentication scenarios
- [ ] Verify request payloads
- [ ] Test error handling
- [ ] Clean up mocks after tests

### Functional Test Checklist

- [ ] Check environment variables
- [ ] Create and cleanup test data
- [ ] Test real workflows
- [ ] Handle network failures gracefully

## Common Patterns

### Testing Async Methods

```typescript
it("should handle async operations", async () => {
  const result = await server["handleAsyncMethod"](args);
  expect(result).toBeDefined();
});
```

### Testing Error Scenarios

```typescript
it("should throw error for invalid input", async () => {
  await expect(server["method"](invalidArgs)).rejects.toThrow(
    "Expected error message",
  );
});
```

### Mocking HTTP Requests

```typescript
nock("https://test.plone.com")
  .post("/++api++/folder", expectedPayload)
  .reply(201, mockResponse);
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Descriptive Names**: Test names should clearly describe what is being tested
3. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification
4. **Mock External Dependencies**: Don't make real HTTP requests in unit/integration tests
5. **Clean Up**: Always clean up test data and mocks
6. **Performance Awareness**: Keep tests fast and efficient

## Debugging Tests

### Debug Single Test

```bash
npm test -- --testNamePattern="specific test name"
```

### Debug with Logging

```bash
DEBUG=* npm test
```

### VS Code Debug Configuration

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal"
}
```

## TypeScript/Vitest Testing, examples of unittesting MCP servers

TypeScript MCP servers follow similar patterns but leverage vitest's powerful mocking capabilities. The async nature of MCP operations maps well to vitest's promise-based testing approach.

```
import { describe, it, expect, vi } from 'vitest'
import { MCPServer } from '@modelcontextprotocol/sdk'
import { createTestClient } from './test-utils'

describe('MCP Tool Tests', () => {
  it('should execute calculation tool correctly', async () => {
    const server = new MCPServer()

    server.tool('multiply', {
      description: 'Multiply two numbers',
      inputSchema: {
        type: 'object',
        properties: {
          a: { type: 'number' },
          b: { type: 'number' }
        },
        required: ['a', 'b']
      }
    }, async ({ a, b }) => {
      return { result: a * b }
    })

    const client = createTestClient(server)
    const result = await client.callTool('multiply', { a: 4, b: 7 })

    expect(result.result).toBe(28)
  })

  it('should handle errors gracefully', async () => {
    const server = new MCPServer()

    server.tool('divide', {
      inputSchema: {
        type: 'object',
        properties: {
          a: { type: 'number' },
          b: { type: 'number' }
        }
      }
    }, async ({ a, b }) => {
      if (b === 0) throw new Error('Division by zero')
      return { result: a / b }
    })

    const client = createTestClient(server)

    await expect(
      client.callTool('divide', { a: 10, b: 0 })
    ).rejects.toThrow('Division by zero')
  })
})
```

and testing an MCP Server with state management:

```
import { describe, it, expect, beforeEach } from 'vitest'
import { StatefulMCPServer } from './stateful-server'
import { createTestClient } from './test-utils'

describe('Stateful MCP Server', () => {
  let server: StatefulMCPServer
  let client: TestClient

  beforeEach(() => {
    server = new StatefulMCPServer()
    client = createTestClient(server)
  })

  it('should maintain conversation context', async () => {
    // Set context
    await client.callTool('set_context', {
      user: 'testuser',
      session: 'test123'
    })

    // First tool call uses context
    const result1 = await client.callTool('get_personalized_greeting', {})
    expect(result1.message).toBe('Hello, testuser!')

    // Subsequent calls remember context
    const result2 = await client.callTool('get_session_info', {})
    expect(result2.session).toBe('test123')
    expect(result2.callCount).toBe(2)
  })

  it('should isolate state between clients', async () => {
    const client2 = createTestClient(server)

    // Set different context for each client
    await client.callTool('set_context', { user: 'alice' })
    await client2.callTool('set_context', { user: 'bob' })

    // Verify isolation
    const result1 = await client.callTool('whoami', {})
    const result2 = await client2.callTool('whoami', {})

    expect(result1.user).toBe('alice')
    expect(result2.user).toBe('bob')
  })
})
```
<!-- End of import from: TESTING.md -->

## Makefile Targets

- `all`: Show this help.
- `format`: Format code using Prettier.
- `test`: Run all tests.
- `type-check`: Run TypeScript type checking

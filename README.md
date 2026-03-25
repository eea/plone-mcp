# Plone MCP Server

A Model Context Protocol (MCP) server for integrating MCP clients with Plone CMS via REST API. Built with the official `@modelcontextprotocol/sdk`, it enables content management, advanced search, workflow operations, and sophisticated Volto blocks management.

## Prerequisites

- **Node.js 18+** - Required to run the server
- **pnpm 8+** - Recommended package manager
- **Plone 6.0+** site with REST API (`plone.restapi` 8.0+)

## Quick Start using Claude Desktop

1. **Install and Build**

```bash
git clone https://github.com/plone/plone-mcp.git
cd plone-mcp
pnpm install
pnpm run build
```

2. **Start the Server**

The server supports two transports: HTTP (default) and STDIO.

**HTTP Transport (Recommended):**
```bash
pnpm start
```
The server starts on `http://localhost:3001/mcp` by default.

**STDIO Transport:**
```bash
pnpm run stdio
```

3. **Configure Claude Desktop**

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "plone": {
      "command": "node",
      "args": ["/path/to/plone-mcp/dist/stdio-server.js"],
      "env": {
        "PLONE_BASE_URL": "https://demo.plone.org",
        "PLONE_USERNAME": "admin",
        "PLONE_PASSWORD": "admin"
      }
    }
  }
}
```

**Using a Remote Deployed Server:**

If the MCP server is already deployed (e.g., at `https://plone-mcp.eea.europa.eu/mcp`), you can use `mcp-remote` to connect directly without local installation:

```json
{
  "mcpServers": {
    "plone": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://plone-mcp.eea.europa.eu/mcp"],
      "env": {
        "PLONE_BASE_URL": "https://demo.plone.org",
        "PLONE_USERNAME": "admin",
        "PLONE_PASSWORD": "admin"
      }
    }
  }
}
```

4. **Connect to Plone**

Run `plone_configure` once per session to authenticate:

```javascript
// Using environment variables already set in config
plone_configure({});

// OR providing credentials directly
plone_configure({
  baseUrl: "https://demo.plone.org",
  username: "admin",
  password: "admin"
});

// OR providing a JWT token
plone_configure({
  baseUrl: "https://demo.plone.org",
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
});
```

## Core Features

- **Content Management**: Full CRUD operations for all Plone content types.
- **Advanced Block System**: Support for Volto blocks (Slate, Teaser, Grid, Image, Listing, etc.) with automatic layout management.
- **Slate Support**: Automatic conversion from Markdown to Plone's Slate JSON format.
- **Search**: Powerful full-text search with filtering by content type, path, and workflow state.
- **Workflow**: Manage publication states and transitions.
- **Schema Discovery**: Explore content types, block schemas, and vocabularies.

## Available Tools

### Configuration

- **`plone_configure`**: Authenticates with Plone. **Must be called once per session.** Supports `baseUrl`, `username`, `password`, and `token`. Environment variables (`PLONE_BASE_URL`, `PLONE_USERNAME`, `PLONE_PASSWORD`, `PLONE_TOKEN`) are used as fallbacks.

### Content Management

- **`plone_get_content`**: Retrieves JSON data for a content item by path.
- **`plone_create_content`**: Creates new content. Handles block structures prepared via `plone_create_blocks_layout`.
- **`plone_update_content`**: Modifies existing content.
- **`plone_delete_content`**: Permanently removes content.

### Search and Discovery

- **`plone_search`**: Detailed search with filters (`portal_type`, `path`, `review_state`) and sorting.
- **`plone_get_site_info`**: Metadata about the Plone site.
- **`plone_get_types`**: List of available content types.
- **`plone_get_type_schema`**: Detailed JSON schema for a specific content type.
- **`plone_get_vocabularies`**: Fetch allowed values for fields (e.g., tags, categories).

### Workflow

- **`plone_get_workflow_info`**: Current state and available transitions.
- **`plone_transition_workflow`**: Change workflow state (e.g., 'publish', 'submit').

### Block Management

- **`plone_get_block_schemas`**: Get schema definitions for Volto blocks.
- **`plone_create_blocks_layout`**: Prepares a complete block structure in memory (60s TTL). Used immediately before `plone_create_content` or `plone_update_content`.
- **`plone_add_single_block`**: Insert a block into existing content.
- **`plone_update_single_block`**: Modify an existing block by ID.
- **`plone_remove_single_block`**: Delete a block by ID.

## Volto Block System

The server uses a specialized workflow for creating rich content with blocks:

1. **Learn**: Use `plone_get_block_schemas` to understand block data structures.
2. **Prepare**: Call `plone_create_blocks_layout` with an array of blocks.
3. **Commit**: Call `plone_create_content` or `plone_update_content` to apply the layout.

### Supported Block Types

- **`slate` / `text`**: Rich text blocks. Input is **Markdown**, which is automatically converted to Slate JSON.
- **`teaser`**: Link previews. Use `href` to point to content; set `overwrite: true` to customize title/image.
- **`image`**: Display images. Supports `url`, `alt`, `align`, and `size`.
- **`gridBlock`**: Multi-column layouts (up to 4 columns) containing other blocks.
- **`listing`**: Dynamic lists of content based on queries (variations: `default`, `summary`, `grid`, `imageGallery`).
- **`__button`**: Call-to-action buttons.
- **`separator`**: Visual horizontal dividers.

### Example: Creating a Page with Grid and Teasers

```javascript
plone_create_blocks_layout({
  blocks: [
    { type: "slate", data: { text: "## Welcome to our Grid Layout" } },
    { 
      type: "gridBlock", 
      data: {
        blocks: {
          "col1": { "@type": "teaser", href: "/news/item-1" },
          "col2": { "@type": "teaser", href: "/news/item-2" }
        },
        blocks_layout: { items: ["col1", "col2"] }
      }
    }
  ]
});

plone_create_content({
  parentPath: "/",
  type: "Document",
  title: "Modern Landing Page"
});
```

## Resources and Prompts

This MCP server provides additional capabilities beyond tools:

### Resources
- **`plone://content/{path}`**: Direct access to content JSON.
- **`plone://site`**: Site-level information.
- **`plone://types`**: List of all content types.

### Prompts
- **`create-page-workflow`**: Guided workflow for creating a new page with content.
- **`create-example-site-workflow`**: Template for scaffolding a basic site structure.

## Configuration & Environment

| Variable | Description |
|----------|-------------|
| `PLONE_BASE_URL` | Base URL of the Plone site (e.g., `https://demo.plone.org`) |
| `PLONE_USERNAME` | Username for authentication |
| `PLONE_PASSWORD` | Password for authentication |
| `PLONE_TOKEN` | JWT Token (alternative to user/pass) |
| `PLONE_PREPARED_BLOCKS_TTL` | Optional: Time-to-live for prepared blocks in milliseconds (default: `60000`) |
| `ENABLED_TOOLS` | Optional: Comma-separated list of tool names to enable (e.g., `plone_configure,plone_get_content,plone_search`). `plone_configure` is always enabled. |

## Development

The project includes a `Makefile` for common tasks:

- `make build`: Build the project.
- `make dev`: Start development server with hot reload (via `tsx`).
- `make start`: Start production HTTP server.
- `make test`: Run all tests.
- `make type-check`: Run TypeScript validation.
- `make format`: Format code with Prettier.
- `make inspector`: Open MCP Inspector.

### Manual Testing with `curl`

When testing the MCP server via HTTP using `curl`, you **must** include both `Content-Type: application/json` and `Accept: application/json` headers.

**Test Website:** You can use `https://demo.plone.org` for testing (credentials: `admin`/`admin`).

**Example: Configure and List Tools**

```bash
# 1. Configure session
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "mcp-session-id: my-test-session" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "plone_configure", "arguments": {"baseUrl": "https://demo.plone.org"}}}'

# 2. List tools (filtered by ENABLED_TOOLS if set)
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "mcp-session-id: my-test-session" \
  -d '{"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}'

## Troubleshooting

- **Auth Errors**: Ensure `plone_configure` is called at the start of every session.
- **Block Expiry**: Prepared blocks last only 60 seconds by default. Always call `plone_create_blocks_layout` immediately before the content tool. This can be adjusted via `PLONE_PREPARED_BLOCKS_TTL`.
- **Markdown Conversion**: Only standard GFM is supported in Slate blocks. Complex HTML in Markdown may be ignored.

## License

MIT

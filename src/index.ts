#!/usr/bin/env node

import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PloneToolHandlers } from "./handlers.js";
import { z } from "zod";

const ENV_ENABLED_TOOLS = "ENABLED_TOOLS";

// =============================================================================
// SECTION 1: CONFIGURATION & TYPES
// =============================================================================

// =============================================================================
// SECTION 4: MAIN MCP SERVER CLASS
// =============================================================================

export class PloneMCPServer {
  private server: McpServer;
  private handlers: PloneToolHandlers;

  constructor() {
    this.server = new McpServer(
      {
        name: "plone-mcp-server",
        version: "1.0.0",
        description:
          "A comprehensive toolkit for managing a Plone CMS. Use these tools to create, read, update, delete (CRUD), and search for content. It also provides powerful features for managing Volto blocks and content workflows.",
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
          resources: {},
        },
      },
    );
    this.handlers = new PloneToolHandlers(null);

    this.setupToolHandlers();
    this.setupResources();
    this.setupPrompts();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.server.onerror = (error: any) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.server.close();
      process.exit(0);
    });
  }

  // =============================================================================
  // TOOL REGISTRATION
  // =============================================================================

  private setupToolHandlers(): void {
    const enabledToolsEnv = process.env[ENV_ENABLED_TOOLS];
    const enabledTools =
      enabledToolsEnv === ""
        ? [] // If empty string, no tools are explicitly enabled (except plone_configure)
        : enabledToolsEnv
          ? enabledToolsEnv.split(",").map((tool) => tool.trim())
          : null; // If null/undefined, all tools are enabled

    const isToolEnabled = (toolName: string): boolean => {
      if (enabledTools === null) {
        return true; // All tools enabled by default
      }
      return enabledTools.includes(toolName);
    };

    // Configuration tools
    this.server.registerTool(
      "plone_configure",
      {
        title: "Configure Plone Connection",
        description:
          "Establishes and authenticates the connection to a Plone CMS. **Must be called once per session** before other tools can be used. Configuration can be provided via arguments or environment variables (PLONE_BASE_URL, PLONE_USERNAME, PLONE_PASSWORD, PLONE_TOKEN). Arguments take precedence over environment variables. To use environment variables only, call with an empty object: plone_configure({}). Example with arguments: plone_configure({baseUrl: 'https://demo.plone.org', username: 'admin', password: 'secret'}).",
        inputSchema: this.handlers.PloneConfigureSchema.shape,
      },
      async (args) => this.handlers.handleConfigure(args),
    );
    // Content management tools
    if (isToolEnabled("plone_get_content")) {
      this.server.registerTool(
        "plone_get_content",
        {
          title: "Get Plone Content",
          description:
            "Retrieves the full JSON data for a single content item from Plone using its path. Example: plone_get_content({path: '/news/latest-update'})",
          inputSchema: this.handlers.PloneGetContentSchema.shape,
        },
        async (args) => this.handlers.handleGetContent(args),
      );
    }

    if (isToolEnabled("plone_create_content")) {
      this.server.registerTool(
        "plone_create_content",
        {
          title: "Create Plone Content",
          description:
            "Creates a new content item (e.g., a page or news article) in Plone. To add complex block-based content, first prepare the structure with `plone_create_blocks_layout`, then call this tool. Example: plone_create_content({parentPath: '/', type: 'Document', title: 'My Page', description: 'A sample page'})",
          inputSchema: this.handlers.PloneCreateContentSchema.shape,
        },
        async (args) => this.handlers.handleCreateContent(args),
      );
    }

    if (isToolEnabled("plone_update_content")) {
      this.server.registerTool(
        "plone_update_content",
        {
          title: "Update Plone Content",
          description:
            "Modifies an existing content item in Plone. Can update metadata (like title) and/or replace the entire block structure. Use `plone_create_blocks_layout` to prepare complex block updates. Example: plone_update_content({path: '/my-page', title: 'Updated Title'})",
          inputSchema: this.handlers.PloneUpdateContentSchema.shape,
        },
        async (args) => this.handlers.handleUpdateContent(args),
      );
    }

    if (isToolEnabled("plone_delete_content")) {
      this.server.registerTool(
        "plone_delete_content",
        {
          title: "Delete Plone Content",
          description:
            "Permanently deletes a content item from Plone using its path. Example: plone_delete_content({path: '/old-content'})",
          inputSchema: this.handlers.PloneDeleteContentSchema.shape,
        },
        async (args) => this.handlers.handleDeleteContent(args),
      );
    }

    // Search and discovery tools
    if (isToolEnabled("plone_search")) {
      this.server.registerTool(
        "plone_search",
        {
          title: "Search Plone Content",
          description:
            "Performs a detailed search for content items, allowing filters by text, content type, path, and workflow state. Example: plone_search({query: 'annual report', portal_type: ['Document'], review_state: ['published']})",
          inputSchema: this.handlers.PloneSearchSchema.shape,
        },
        async (args) => this.handlers.handleSearch(args),
      );
    }

    if (isToolEnabled("plone_get_site_info")) {
      this.server.registerTool(
        "plone_get_site_info",
        {
          title: "Get Site Information",
          description:
            "Retrieves top-level information and metadata about the connected Plone site, such as available languages and Plone version.",
          inputSchema: {},
        },
        async (args) => this.handlers.handleGetSiteInfo(args),
      );
    }

    if (isToolEnabled("plone_get_types")) {
      this.server.registerTool(
        "plone_get_types",
        {
          title: "Get Content Types",
          description:
            "Lists all available content types that can be created in the Plone site (e.g., 'Document', 'Event').",
          inputSchema: {},
        },
        async (args) => this.handlers.handleGetTypes(args),
      );
    }

    if (isToolEnabled("plone_get_vocabularies")) {
      this.server.registerTool(
        "plone_get_vocabularies",
        {
          title: "Get Vocabulary Values",
          description:
            "Fetches the allowed values for a specific field, such as a list of categories or tags. Useful for finding valid inputs for content fields. Example: plone_get_vocabularies({vocabulary: 'plone.app.vocabularies.Keywords'})",
          inputSchema: this.handlers.PloneGetVocabulariesSchema.shape,
        },
        async (args) => this.handlers.handleGetVocabularies(args),
      );
    }

    // Workflow tools
    if (isToolEnabled("plone_get_workflow_info")) {
      this.server.registerTool(
        "plone_get_workflow_info",
        {
          title: "Get Workflow Information",
          description:
            "Shows the current workflow state (e.g., 'Published', 'Private') and available transitions for a content item. Example: plone_get_workflow_info({path: '/my-document'})",
          inputSchema: this.handlers.PloneGetWorkflowInfoSchema.shape,
        },
        async (args) => this.handlers.handleGetWorkflowInfo(args),
      );
    }

    if (isToolEnabled("plone_transition_workflow")) {
      this.server.registerTool(
        "plone_transition_workflow",
        {
          title: "Execute Workflow Transition",
          description:
            "Changes the workflow state of a content item by executing a specific transition, like 'publish' or 'submit'. Example: plone_transition_workflow({path: '/my-document', transition: 'publish'})",
          inputSchema: this.handlers.PloneTransitionWorkflowSchema.shape,
        },
        async (args) => this.handlers.handleTransitionWorkflow(args),
      );
    }

    // Block management tools
    if (isToolEnabled("plone_get_block_schemas")) {
      this.server.registerTool(
        "plone_get_block_schemas",
        {
          title: "Get Block Schemas",
          description:
            "Lists all available Volto block types (e.g., 'slate', 'teaser', 'button') and their required data schemas. **Essential for understanding how to construct blocks.** Example: plone_get_block_schemas({blockType: 'teaser'})",
          inputSchema: this.handlers.PloneGetBlockSchemasSchema.shape,
        },
        async (args) => this.handlers.handleGetBlockSchemas(args),
      );
    }

    if (isToolEnabled("plone_create_blocks_layout")) {
      this.server.registerTool(
        "plone_create_blocks_layout",
        {
          title: "Prepare Blocks Layout",
          description:
            "Prepares a complete block structure in memory (valid for 60 seconds). This structure is then used by the **next immediate call** to `plone_create_content` or `plone_update_content`. Use `plone_get_block_schemas` to learn what data each block type needs. The text displayed by the Title block is automatically managed by Plone, DO NOT add it in the block's data. Example: plone_create_blocks_layout({blocks: [{type: 'title'},{type: 'slate', data: {text: 'Hello World'}}]})",
          inputSchema: this.handlers.PloneCreateBlocksLayoutSchema.shape,
        },
        async (args) => this.handlers.handleCreateBlocksLayout(args),
      );
    }

    if (isToolEnabled("plone_add_single_block")) {
      this.server.registerTool(
        "plone_add_single_block",
        {
          title: "Add Single Block",
          description:
            "Adds a single new block to an existing content item without replacing other blocks. Specify the block type, data, and optional position. Example: plone_add_single_block({path: '/my-page', blockType: 'text', blockData: {text: 'New paragraph'}})",
          inputSchema: this.handlers.PloneAddBlockSchema.shape,
        },
        async (args) => this.handlers.handleAddBlock(args),
      );
    }

    if (isToolEnabled("plone_update_single_block")) {
      this.server.registerTool(
        "plone_update_single_block",
        {
          title: "Update Single Block",
          description:
            "Modifies the data of a single, existing block within a content item, identified by its block ID. Example: plone_update_single_block({path: '/my-page', blockId: 'abc123', blockData: {text: 'Updated text'}})",
          inputSchema: this.handlers.PloneUpdateBlockSchema.shape,
        },
        async (args) => this.handlers.handleUpdateBlock(args),
      );
    }

    if (isToolEnabled("plone_remove_single_block")) {
      this.server.registerTool(
        "plone_remove_single_block",
        {
          title: "Remove Single Block",
          description:
            "Deletes a single block from a content item, identified by its block ID. Example: plone_remove_single_block({path: '/my-page', blockId: 'abc123'})",
          inputSchema: this.handlers.PloneRemoveBlockSchema.shape,
        },
        async (args) => this.handlers.handleRemoveBlock(args),
      );
    }
  }

  // =============================================================================
  // RESOURCES SETUP
  // =============================================================================

  private setupResources(): void {
    // Dynamic Plone content resource
    this.server.registerResource(
      "plone-content",
      new ResourceTemplate("plone://{path}", { list: undefined }),
      {
        title: "Plone Content Item",
        description:
          "Provides direct read-only access to the full JSON of a Plone content item via its path.",
      },
      async (uri, { path }) => {
        if (!this.handlers.client) {
          throw new Error(
            "Plone client not configured. Please run plone_configure first.",
          );
        }

        const normalizedPath = this.handlers.client.normalizePath(
          typeof path === "string" ? path : path[0] || "",
        );
        const content = await this.handlers.client.get(normalizedPath);

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(content, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      },
    );

    // Plone site information resource
    this.server.registerResource(
      "plone-site",
      "plone://site",
      {
        title: "Plone Site Information",
        description:
          "Provides direct read-only access to the Plone site's root information object.",
      },
      async (uri) => {
        if (!this.handlers.client) {
          throw new Error(
            "Plone client not configured. Please run plone_configure first.",
          );
        }

        const siteInfo = await this.handlers.client.get("/");

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(siteInfo, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      },
    );

    // Plone content types resource
    this.server.registerResource(
      "plone-types",
      "plone://types",
      {
        title: "Plone Content Types",
        description:
          "Provides direct read-only access to the list of available content types.",
      },
      async (uri) => {
        if (!this.handlers.client) {
          throw new Error(
            "Plone client not configured. Please run plone_configure first.",
          );
        }

        const types = await this.handlers.client.get("/@types");

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(types, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      },
    );
  }

  // =============================================================================
  // PROMPTS SETUP
  // =============================================================================

  private setupPrompts(): void {
    // Content creation workflow prompts
    this.server.registerPrompt(
      "create-page-workflow",
      {
        title: "Create a Single Web Page",
        description:
          "A guided workflow to create a single web page with specific content and structure.",
        argsSchema: {
          contentType: z
            .string()
            .describe(
              "Type of content to create (e.g., 'Document', 'News Item')",
            ),
          purpose: z.string().describe("The purpose or topic of the page"),
          audience: z
            .string()
            .optional()
            .describe("The target audience for the page"),
        },
      },
      ({ contentType, purpose, audience }) => ({
        messages: [
          {
            role: "user",
            content: {
              type: "text" as const,
              text: `My goal is to create a new ${contentType} page about "${purpose}"${
                audience ? ` for an audience of ${audience}` : ""
              }. Perform the following steps:

1.  Ensure the Plone connection is configured.
2.  Determine the best parent path for this new content.
3.  Create the page with a fitting title and description.
4.  Add relevant content blocks (like text and images) to build out the page.
5.  Finally, publish the page by transitioning its workflow state.

Begin with the first step.`,
            },
          },
        ],
      }),
    );
    this.server.registerPrompt(
      "create-example-site-workflow",
      {
        title: "Create a Multi-Page Example Site",
        description:
          "A guided workflow to create a small, multi-page example website with interconnected content.",
        argsSchema: {
          contentTypes: z
            .string()
            .describe(
              "Types of content to create (e.g., 'Documents, News Items')",
            ),
          purpose: z
            .string()
            .describe("The overall theme or topic of the site"),
          audience: z
            .string()
            .optional()
            .describe("The target audience for the site"),
          numberOfPages: z
            .string()
            .optional()
            .describe("The number of pages to create (default is 3)"),
        },
      },
      ({ contentTypes, purpose, numberOfPages = "3", audience }) => ({
        messages: [
          {
            role: "user",
            content: {
              type: "text" as const,
              text: `My goal is to create an example site with ${numberOfPages} pages of type ${contentTypes}, all centered around the theme of "${purpose}"${
                audience ? `, aimed at an audience of ${audience}` : ""
              }. Follow this plan:

1.  Ensure the Plone connection is configured.
2.  Establish a logical folder (Document type objects can be used as folders) structure for the new pages.
3.  Create each of the ${numberOfPages} pages with appropriate titles, descriptions, and content.
4.  Populate each page with relevant and structured content blocks.
5.  Ensure all created pages are published.

Begin this process step-by-step.`,
            },
          },
        ],
      }),
    );
  }

  // =============================================================================
  // SERVER RUNTIME
  // =============================================================================

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Plone MCP server running on stdio");
  }
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

const server = new PloneMCPServer();
server.run().catch(console.error);

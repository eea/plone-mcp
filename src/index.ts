#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { PloneToolHandlers } from "./handlers";
import { setPloneHandlersInstance } from "./plone-singleton";

// =============================================================================

// SECTION 4: MAIN MCP SERVER CLASS

// =============================================================================

export class PloneMCPServer {
  private server: McpServer;

  private handlers: PloneToolHandlers;

  constructor() {
    this.handlers = new PloneToolHandlers(null);

    setPloneHandlersInstance(this.handlers);

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

    // this.setupResources();
    // this.setupPrompts(); // Removed as xmcp will automatically discover prompts

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

#!/usr/bin/env node

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse";
import http from "http";
import { z } from "zod";
import { sessionManager } from "./session-manager";

import ploneAddSingleBlock, { schema as ploneAddSingleBlockSchema } from "./tools/plone_add_single_block";
import ploneConfigure, { schema as ploneConfigureSchema } from "./tools/plone_configure";
import ploneCreateBlocksLayout, { schema as ploneCreateBlocksLayoutSchema } from "./tools/plone_create_blocks_layout";
import ploneCreateContent, { schema as ploneCreateContentSchema } from "./tools/plone_create_content";
import ploneDeleteContent, { schema as ploneDeleteContentSchema } from "./tools/plone_delete_content";
import ploneGetBlockSchemas, { schema as ploneGetBlockSchemasSchema } from "./tools/plone_get_block_schemas";
import ploneGetContent, { schema as ploneGetContentSchema } from "./tools/plone_get_content";
import ploneGetNavigationTree, { schema as ploneGetNavigationTreeSchema } from "./tools/plone_get_navigation_tree";
import ploneGetSiteInfo, { schema as ploneGetSiteInfoSchema } from "./tools/plone_get_site_info";
import ploneGetTypes, { schema as ploneGetTypesSchema } from "./tools/plone_get_types";
import ploneGetVocabularies, { schema as ploneGetVocabulariesSchema } from "./tools/plone_get_vocabularies";
import ploneGetWorkflowInfo, { schema as ploneGetWorkflowInfoSchema } from "./tools/plone_get_workflow_info";
import ploneRemoveSingleBlock, { schema as ploneRemoveSingleBlockSchema } from "./tools/plone_remove_single_block";
import ploneSearch, { schema as ploneSearchSchema } from "./tools/plone_search";
import ploneTransitionWorkflow, { schema as ploneTransitionWorkflowSchema } from "./tools/plone_transition_workflow";
import ploneUpdateContent, { schema as ploneUpdateContentSchema } from "./tools/plone_update_content";
import ploneUpdateSingleBlock, { schema as ploneUpdateSingleBlockSchema } from "./tools/plone_update_single_block";

import contentHandler, { metadata as contentMetadata, schema as contentSchema } from "./resources/plone/content";
import siteHandler, { metadata as siteMetadata, schema as siteSchema } from "./resources/plone/site";
import typesHandler, { metadata as typesMetadata, schema as typesSchema } from "./resources/plone/types";

// Helper to ensure correct content type
const asText = (result: { content: { type: string; text: string }[] }) => ({
  content: result.content.map(c => ({ type: "text" as const, text: c.text }))
});

export class PloneMcpServer {
  private server: McpServer;
  private httpServer: http.Server;
  private transport: SSEServerTransport | undefined;

  constructor() {
    this.server = new McpServer(
      {
        name: "Plone MCP Server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.httpServer = http.createServer(async (req, res) => {
      if (req.url === "/sse") {
        this.transport = new SSEServerTransport("/messages", res);
        await this.server.connect(this.transport);
        return;
      }
      if (req.url === "/messages" && req.method === "POST") {
        if (this.transport) {
          await this.transport.handlePostMessage(req, res);
        } else {
          res.writeHead(400);
          res.end("No active transport");
        }
        return;
      }
      res.writeHead(404);
      res.end("Not Found");
    });

    this.setupTools();
    this.setupResources();
  }

  private setupTools() {
    this.server.tool("plone_add_single_block", ploneAddSingleBlockSchema, async (args) => asText(await ploneAddSingleBlock(args as any)) as any);
    this.server.tool("plone_configure", ploneConfigureSchema, async (args) => asText(await ploneConfigure(args as any)) as any);
    this.server.tool("plone_create_blocks_layout", ploneCreateBlocksLayoutSchema, async (args) => asText(await ploneCreateBlocksLayout(args as any)) as any);
    this.server.tool("plone_create_content", ploneCreateContentSchema, async (args) => asText(await ploneCreateContent(args as any)) as any);
    this.server.tool("plone_delete_content", ploneDeleteContentSchema, async (args) => asText(await ploneDeleteContent(args as any)) as any);
    this.server.tool("plone_get_block_schemas", ploneGetBlockSchemasSchema, async (args) => asText(await ploneGetBlockSchemas(args as any)) as any);
    this.server.tool("plone_get_content", ploneGetContentSchema, async (args) => asText(await ploneGetContent(args as any)) as any);
    this.server.tool("plone_get_navigation_tree", ploneGetNavigationTreeSchema, async (args) => asText(await ploneGetNavigationTree(args as any)) as any);
    this.server.tool("plone_get_site_info", ploneGetSiteInfoSchema, async (args) => asText(await ploneGetSiteInfo(args as any)) as any);
    this.server.tool("plone_get_types", ploneGetTypesSchema, async (args) => asText(await ploneGetTypes(args as any)) as any);
    this.server.tool("plone_get_vocabularies", ploneGetVocabulariesSchema, async (args) => asText(await ploneGetVocabularies(args as any)) as any);
    this.server.tool("plone_get_workflow_info", ploneGetWorkflowInfoSchema, async (args) => asText(await ploneGetWorkflowInfo(args as any)) as any);
    this.server.tool("plone_remove_single_block", ploneRemoveSingleBlockSchema, async (args) => asText(await ploneRemoveSingleBlock(args as any)) as any);
    this.server.tool("plone_search", ploneSearchSchema, async (args) => asText(await ploneSearch(args as any)) as any);
    this.server.tool("plone_transition_workflow", ploneTransitionWorkflowSchema, async (args) => asText(await ploneTransitionWorkflow(args as any)) as any);
    this.server.tool("plone_update_content", ploneUpdateContentSchema, async (args) => asText(await ploneUpdateContent(args as any)) as any);
    this.server.tool("plone_update_single_block", ploneUpdateSingleBlockSchema, async (args) => asText(await ploneUpdateSingleBlock(args as any)) as any);
  }

  private setupResources() {
    // Content resource
    this.server.resource(
      contentMetadata.name,
      new ResourceTemplate("plone://content/{path}", { list: undefined }),
      async (uri, params) => {
        return contentHandler(uri, params as any);
      }
    );

    // Site resource
    this.server.resource(
      siteMetadata.name,
      new ResourceTemplate("plone://site", { list: undefined }),
      async (uri) => {
        return siteHandler({});
      }
    );

    // Types resource
    this.server.resource(
      typesMetadata.name,
      new ResourceTemplate("plone://types", { list: undefined }),
      async (uri) => {
        return typesHandler(uri, {});
      }
    );
  }

  async run() {
    const port = process.env.PORT || 3000;
    this.httpServer.listen(port, () => {
      console.error(`Plone MCP server running on port ${port}`);
    });
  }
}

const server = new PloneMcpServer();
server.run().catch(console.error);

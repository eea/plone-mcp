import { z } from "zod";
import { headers } from "xmcp/headers";
import { sessionManager } from "plone-mcp/session-manager";
import { blockRegistry } from "plone-mcp/block-registry";
import {
  wrapError,
  generateBlockId,
  processBlock,
  validateImageURL,
} from "plone-mcp/utils/block-utils";
import { PloneContent } from "plone-mcp/plone-client";
import { getSessionId } from "plone-mcp/utils/session";
import type { InferSchema, ToolMetadata } from "xmcp";

export const schema = {
  path: z.string().describe("Path to the content"),
  blockType: z
    .enum(blockRegistry.getBlockTypesEnum())
    .describe("Type of block to add"),
  blockData: z.record(z.string(), z.unknown()).describe("Block-specific data"),
  position: z
    .number()
    .optional()
    .describe("Position to insert the block (optional, defaults to end)"),
};

export const metadata: ToolMetadata = {
  name: "plone_add_single_block",
  description:
    "Adds a single new block to an existing content item without replacing other blocks. Specify the block type, data, and optional position. Example: plone_add_single_block({path: '/my-page', blockType: 'text', blockData: {text: 'New paragraph'}})",
  annotations: {
    title: "Add Single Block",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
};

export default async function ploneAddSingleBlock(
  args: InferSchema<typeof schema>,
) {
  try {
    const requestHeaders = headers();
    const sessionId = getSessionId(requestHeaders);
    const service = sessionManager.getSession(sessionId);
    const { path, blockType, position, blockData } = args;
    const client = service.getClient();

    // First get the current content
    const content = (await client.get(path)) as PloneContent;

    const blocks = content.blocks || {};
    const blocks_layout = content.blocks_layout || { items: [] };

    // Generate new block ID
    const blockId = generateBlockId();

    // Validate image URLs asynchronously before processing
    if (
      blockType === "image" &&
      typeof blockData.url === "string" &&
      blockData.url
    ) {
      const isValid = await validateImageURL(blockData.url);
      if (!isValid) {
        throw wrapError(
          "AddBlock",
          `Invalid or inaccessible image URL: ${blockData.url} `,
        );
      }
    }

    // Process block using centralized logic
    try {
      blocks[blockId] = processBlock(blockType, blockData);
    } catch (error) {
      throw new Error(
        `Error processing block data: ${
          error instanceof Error ? error.message : String(error)
        } `,
      );
    }

    // Insert at specified position or at the end
    if (
      position !== undefined &&
      position >= 0 &&
      position <= blocks_layout.items.length
    ) {
      blocks_layout.items.splice(position, 0, blockId);
    } else {
      blocks_layout.items.push(blockId);
    }

    // Update the content
    const updatedContent = await client.patch(path, {
      blocks,
      blocks_layout,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(updatedContent, null, 2),
        },
      ],
    };
  } catch (error) {
    throw wrapError("AddBlock", error);
  }
}

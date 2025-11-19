import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { headers } from "xmcp/headers";
import { sessionManager } from "../session-manager";
import { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types";
import { wrapError } from "../utils/block-utils";
import { PloneContent } from "../plone-client";
import { getSessionId } from "../utils/session";

export const schema = z.object({
  path: z.string().describe("Path to the content"),
  blockId: z.string().describe("ID of the block to remove"),
});

export const metadata: ToolMetadata = {
  name: "plone_remove_single_block",
  description:
    "Deletes a single block from a content item, identified by its block ID. Example: plone_remove_single_block({path: '/my-page', blockId: 'abc123'})",
  annotations: {
    title: "Remove Single Block",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
  },
};

export default async function ploneRemoveSingleBlock(
  args: InferSchema<typeof schema>,
): Promise<CallToolResult> {
  try {
    const { path, blockId } = args;
    const requestHeaders = headers();
    const sessionId = getSessionId(requestHeaders);
    const service = sessionManager.getSession(sessionId);
    const client = service.getClient();

    // First get the current content
    const content: PloneContent = await client.get(path);

    const blocks = content.blocks || {};
    const blocks_layout = content.blocks_layout || { items: [] };

    if (!blocks[blockId]) {
      const availableBlockIds = Object.keys(blocks);
      throw new Error(
        `Block with ID '${blockId}' not found. Available block IDs: ${availableBlockIds.join(
          ", ",
        )}`,
      );
    }

    // Remove the block
    delete blocks[blockId];

    // Remove from layout
    const index = blocks_layout.items.indexOf(blockId);
    if (index > -1) {
      blocks_layout.items.splice(index, 1);
    }

    // Update the content
    const updatedContent = await client.patch(path, {
      blocks,
      blocks_layout,
    });

    const textContent: TextContent = {
      type: "text",
      text: JSON.stringify(updatedContent, null, 2),
    };

    return {
      content: [textContent],
    };
  } catch (error) {
    throw wrapError("RemoveBlock", error);
  }
}

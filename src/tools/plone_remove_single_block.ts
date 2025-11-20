import { z } from "zod";
import type { InferSchema, ToolMetadata } from "xmcp";
import { headers } from "xmcp/headers";
import { sessionManager } from "plone-mcp/session-manager";

import { wrapError } from "plone-mcp/utils/block-utils";
import { PloneContent } from "plone-mcp/plone-client";
import { getSessionId } from "plone-mcp/utils/session";

export const schema = {
  path: z.string().describe("Path to the content"),
  blockId: z.string().describe("ID of the block to remove"),
};

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

interface PloneRemoveSingleBlockArgs {
  path: string;
  blockId: string;
}

export default async function ploneRemoveSingleBlock(
  args: InferSchema<typeof schema> & PloneRemoveSingleBlockArgs,
): Promise<{ content: { type: "text"; text: string }[] }> {
  try {
    const { path, blockId } = args;
    const requestHeaders = headers();
    const sessionId = getSessionId(requestHeaders);
    const service = sessionManager.getSession(sessionId);
    const client = service.getClient();

    // First get the current content
    const content = (await client.get(path)) as PloneContent;

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
    const updatedBlocks = Object.fromEntries(
      Object.entries(blocks).filter(([key]) => key !== blockId),
    );
    // Set the blocks to the new object without the removed block

    // Remove from layout
    const index = blocks_layout.items.indexOf(blockId);
    if (index > -1) {
      blocks_layout.items.splice(index, 1);
    }

    // Update the content
    const updatedContent = (await client.patch(path, {
      blocks: updatedBlocks,
      blocks_layout,
    })) as PloneContent;

    const textContent = {
      type: "text" as const,
      text: JSON.stringify(updatedContent, null, 2),
    };

    return {
      content: [textContent],
    };
  } catch (error) {
    throw wrapError("RemoveBlock", error);
  }
}

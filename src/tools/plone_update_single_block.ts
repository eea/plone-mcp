import { z } from "zod";
import { headers } from "xmcp/headers";
import { sessionManager } from "plone-mcp/session-manager";

import {
  wrapError,
  processBlock,
} from "plone-mcp/utils/block-utils";
import { PloneContent } from "plone-mcp/plone-client";
import { getSessionId } from "plone-mcp/utils/session";
import type { InferSchema, ToolMetadata } from "xmcp";

export const schema = {
  path: z.string().describe("Path to the content"),
  blockId: z.string().describe("ID of the block to update"),
  blockData: z.record(z.string(), z.unknown()).describe("New block data"),
};

export const metadata: ToolMetadata = {
  name: "plone_update_single_block",
  description:
    "Modifies the data of a single, existing block within a content item, identified by its block ID. Example: plone_update_single_block({path: '/my-page', blockId: 'abc123', blockData: {text: 'Updated text'}})",
  annotations: {
    title: "Update Single Block",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  },
};

interface PloneUpdateSingleBlockArgs {
  path: string;
  blockId: string;
  blockData: Record<string, unknown>;
}

export default async function ploneUpdateSingleBlock(
  args: InferSchema<typeof schema> & PloneUpdateSingleBlockArgs,
): Promise<{ content: { type: "text"; text: string }[] }> {
  try {
    const { path, blockId, blockData } = args;
    const requestHeaders = headers();
    const sessionId = getSessionId(requestHeaders);
    const service = sessionManager.getSession(sessionId);
    const client = service.getClient();

    // First get the current content
    const content = (await client.get(path)) as PloneContent;

    const blocks = content.blocks || {};

    if (!blocks[blockId]) {
      const availableBlockIds = Object.keys(blocks);
      throw new Error(
        `Block with ID '${blockId}' not found. Available block IDs: ${availableBlockIds.join(
          ", ",
        )}`,
      );
    }

    // Update the specific block
    const existingBlock = blocks[blockId] as Record<string, unknown>;
    const blockType =
      (blockData["@type"] as string) || (existingBlock["@type"] as string);
    const mergedData = { ...existingBlock, ...blockData };

    blocks[blockId] = processBlock(
      blockType,
      mergedData,
      client.config.baseUrl,
    );

    // Update the content
    const updatedContent = (await client.patch(path, {
      blocks,
    })) as PloneContent;

    const textContent = {
      type: "text" as const,
      text: JSON.stringify(updatedContent, null, 2),
    };

    return {
      content: [textContent],
    };
  } catch (error) {
    throw wrapError("UpdateBlock", error);
  }
}

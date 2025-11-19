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
  blockId: z.string().describe("ID of the block to update"),
  blockData: z.record(z.unknown()).describe("New block data"),
});

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

export default async function ploneUpdateSingleBlock(
  args: InferSchema<typeof schema>,
): Promise<CallToolResult> {
  try {
    const { path, blockId, blockData } = args;
    const requestHeaders = headers();
    const sessionId = getSessionId(requestHeaders);
    const service = sessionManager.getSession(sessionId);
    const client = service.getClient();

    // First get the current content
    const content: PloneContent = await client.get(path);

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
    blocks[blockId] = {
      ...blocks[blockId],
      ...blockData,
    };

    // Update the content
    const updatedContent = await client.patch(path, { blocks });

    const textContent: TextContent = {
      type: "text",
      text: JSON.stringify(updatedContent, null, 2),
    };

    return {
      content: [textContent],
    };
  } catch (error) {
    throw wrapError("UpdateBlock", error);
  }
}

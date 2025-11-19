import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { headers } from "xmcp/headers";
import { sessionManager } from "../session-manager";
import { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types";
import { wrapError } from "../utils/block-utils";

export const schema = {
  path: z.string().describe("Path to the content to update"),
  title: z.string().optional().describe("New title"),
  description: z.string().optional().describe("New description"),
  blocks: z
    .record(z.any())
    .optional()
    .describe("Volto blocks structure for the content"),
  blocks_layout: z
    .record(z.any())
    .optional()
    .describe("Volto blocks layout configuration"),
  additionalFields: z
    .record(z.any())
    .optional()
    .describe(
      "Additional fields to update. For preview images, include preview_image_link: { '@id': 'image-url' } in this object (if you get a 400 error, make sure the image URL is accessible).",
    ),
};

export const metadata: ToolMetadata = {
  name: "plone_update_content",
  description:
    "Modifies an existing content item in Plone. Can update metadata (like title) and/or replace the entire block structure. Use `plone_create_blocks_layout` to prepare complex block updates. Example: plone_update_content({path: '/my-page', title: 'Updated Title'})",
  annotations: {
    title: "Update Plone Content",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function ploneUpdateContent(
  args: InferSchema<typeof schema>,
): Promise<CallToolResult> {
  const requestHeaders = headers();
  const sessionId = (requestHeaders["mcp-session-id"] as string) || "default";
  const service = sessionManager.getSession(sessionId);

  try {
    const parsedArgs = args;
    const client = service.getClient();
    const {
      path,
      title,
      description,
      blocks,
      blocks_layout,
      additionalFields,
    } = parsedArgs;

    if (!path) {
      throw new Error("Path is required for updating content");
    }

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;

    // Use the centralized helper, which will return null if no block changes are needed
    const blockData = service.processBlocksForContent(
      blocks,
      blocks_layout,
      true,
    );
    if (blockData) {
      data.blocks = blockData.blocks;
      data.blocks_layout = blockData.blocks_layout;
    }

    if (additionalFields) Object.assign(data, additionalFields);

    if (Object.keys(data).length === 0) {
      throw new Error("No changes specified for update");
    }

    const content = await client.patch(path, data);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(content, null, 2),
        },
      ],
    };
  } catch (error) {
    const requestHeaders = headers();
    const sessionId = (requestHeaders["mcp-session-id"] as string) || "default";
    const service = sessionManager.getSession(sessionId);
    service.clearPreparedBlocks();
    throw wrapError("UpdateContent", error);
  }
}

import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { headers } from "xmcp/headers";
import { sessionManager } from "../session-manager";
import { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types";
import { wrapError } from "../utils/block-utils";
import { PloneContent } from "../plone-client";
import { getSessionId } from "../utils/session";

export const schema = z.object({
  parentPath: z
    .string()
    .describe(
      "Path where to create the content (e.g., '/parentDocument/document' or '/' for root)",
    ),
  type: z
    .string()
    .describe(
      "Content type to create (e.g., 'Document', 'Event', 'News Item')",
    ),
  title: z.string().describe("Title of the new content"),
  description: z.string().optional().describe("Description of the new content"),
  id: z
    .string()
    .optional()
    .describe(
      "ID for the new content (optional, will be auto-generated if not provided)",
    ),
  blocks: z
    .record(z.unknown())
    .optional()
    .describe(
      "Volto blocks structure for the content, it specifies the blocks data and content",
    ),
  blocks_layout: z
    .record(z.unknown())
    .optional()
    .describe(
      "Volto blocks layout configuration, it specifies the order of blocks",
    ),
  additionalFields: z
    .record(z.unknown())
    .optional()
    .describe(
      "Additional fields to update. For preview images, include preview_image_link: { '@id': 'image-url' } in this object (if you get a 400 error, make sure the image URL is accessible).",
    ),
});

export const metadata: ToolMetadata = {
  name: "plone_create_content",
  description:
    "Creates a new content item (e.g., a page or news article) in Plone. To add complex block-based content, first prepare the structure with `plone_create_blocks_layout`, then call this tool. Example: plone_create_content({parentPath: '/', type: 'Document', title: 'My Page', description: 'A sample page'})",
  annotations: {
    title: "Create Plone Content",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
};

export default async function ploneCreateContent(
  args: InferSchema<typeof schema>,
): Promise<CallToolResult> {
  const requestHeaders = headers();
  const sessionId = getSessionId(requestHeaders);
  const service = sessionManager.getSession(sessionId);

  try {
    const parsedArgs = args;
    const client = service.getClient();
    const {
      parentPath,
      type,
      title,
      description,
      id,
      blocks,
      blocks_layout,
      additionalFields,
    } = parsedArgs;

    const data: Record<string, unknown> = {
      "@type": type,
      title,
    };

    if (description) data.description = description;
    if (id) data.id = id;

    // Use the centralized helper to process blocks
    const blockData = service.processBlocksForContent(
      blocks,
      blocks_layout,
      false,
    );
    if (blockData) {
      data.blocks = blockData.blocks;
      data.blocks_layout = blockData.blocks_layout;
    }

    if (additionalFields) Object.assign(data, additionalFields);

    const content: PloneContent = (await client.post(
      parentPath,
      data,
    )) as PloneContent;

    const textContent: TextContent = {
      type: "text",
      text: JSON.stringify(content, null, 2),
    };

    return {
      content: [textContent],
    };
  } catch (error) {
    // Ensure prepared blocks are cleared on any error
    const requestHeaders = headers();
    const sessionId = getSessionId(requestHeaders);
    const service = sessionManager.getSession(sessionId);
    service.clearPreparedBlocks();
    throw wrapError("CreateContent", error);
  }
}

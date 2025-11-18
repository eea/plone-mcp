import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { ploneHandlersSingleton } from "../plone-singleton";

export const schema = {
  parentPath: z
    .string()
    .describe(
      "Path where to create the content (e.g., '/parentDocument' or '/' for root)",
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
    .record(z.any())
    .optional()
    .describe(
      "Volto blocks structure for the content, it specifies the blocks data and content",
    ),
  blocks_layout: z
    .record(z.any())
    .optional()
    .describe(
      "Volto blocks layout configuration, it specifies the order of blocks",
    ),
  additionalFields: z
    .record(z.any())
    .optional()
    .describe(
      "Additional fields to update. For preview images, include preview_image_link: { '@id': 'image-url' } in this object (if you get a 400 error, make sure the image URL is accessible).",
    ),
};

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
) {
  return ploneHandlersSingleton.handleCreateContent(args);
}

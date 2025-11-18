import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { ploneHandlersSingleton } from "../plone-singleton";

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
) {
  return ploneHandlersSingleton.handleUpdateContent(args);
}

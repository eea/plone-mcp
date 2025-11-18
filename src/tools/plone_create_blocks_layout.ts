import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { ploneHandlersSingleton } from "../plone-singleton.js";
import { blockRegistry } from "../block-registry.js";

export const schema = {
  blocks: z
    .array(
      z.object({
        type: z
          .enum(blockRegistry.getBlockTypesEnum())
          .describe("Type of block to create"),
        data: z
          .record(z.any())
          .describe("Block-specific data following the block specification"),
        position: z
          .number()
          .optional()
          .describe(
            "Position in the layout (optional, defaults to sequential order)",
          ),
      }),
    )
    .describe(
      "Array of block specifications to process. You MUST call plone_get_block_schemas first to see available block types and their required fields. You MUST follow the block specifications EXACTLY, DO NOT invent your own fields. DO NOT add the content object's title in a text block. To set the page title, use the 'title' field of the content object itself when calling plone_create_content or plone_update_content. A Title block will be automatically created by Plone.",
    ),
};

export const metadata: ToolMetadata = {
  name: "plone_create_blocks_layout",
  description:
    "Prepares a complete block structure in memory (valid for 60 seconds). This structure is then used by the **next immediate call** to `plone_create_content` or `plone_update_content`. Use `plone_get_block_schemas` to learn what data each block type needs. The text displayed by the Title block is automatically managed by Plone, DO NOT add it in the block's data. Example: plone_create_blocks_layout({blocks: [{type: 'title'},{type: 'slate', data: {text: 'Hello World'}}]})",
  annotations: {
    title: "Prepare Blocks Layout",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function ploneCreateBlocksLayout(
  args: InferSchema<typeof schema>,
) {
  return ploneHandlersSingleton.handleCreateBlocksLayout(args);
}

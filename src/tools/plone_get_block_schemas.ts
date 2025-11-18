import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { ploneHandlersSingleton } from "../plone-singleton";
import { blockRegistry } from "../block-registry";

export const schema = {
  blockType: z
    .enum(blockRegistry.getBlockTypesEnum())
    .optional()
    .describe(
      "Specific block type to get schema for (optional, returns all if not specified).",
    ),
};

export const metadata: ToolMetadata = {
  name: "plone_get_block_schemas",
  description:
    "Lists all available Volto block types (e.g., 'slate', 'teaser', 'button') and their required data schemas. **Essential for understanding how to construct blocks.** Example: plone_get_block_schemas({blockType: 'teaser'})",
  annotations: {
    title: "Get Block Schemas",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function ploneGetBlockSchemas(
  args: InferSchema<typeof schema>,
) {
  return ploneHandlersSingleton.handleGetBlockSchemas(args);
}

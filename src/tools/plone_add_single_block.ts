import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { ploneHandlersSingleton } from "../plone-singleton.js";
import { blockRegistry } from "../block-registry.js";

export const schema = {
  path: z.string().describe("Path to the content"),
  blockType: z
    .enum(blockRegistry.getBlockTypesEnum())
    .describe("Type of block to add"),
  blockData: z.record(z.any()).describe("Block-specific data"),
  position: z
    .number()
    .optional()
    .describe("Position to insert the block (optional, defaults to end)"),
};

export const metadata: ToolMetadata = {
  name: "plone_add_single_block",
  description:
    "Adds a single new block to an existing content item without replacing other blocks. Specify the block type, data, and optional position. Example: plone_add_single_block({path: '/my-page', blockType: 'text', blockData: {text: 'New paragraph'}})",
  annotations: {
    title: "Add Single Block",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
};

export default async function ploneAddSingleBlock(
  args: InferSchema<typeof schema>,
) {
  return ploneHandlersSingleton.handleAddBlock(args);
}

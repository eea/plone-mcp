import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { ploneHandlersSingleton } from "../plone-singleton.js";

export const schema = {
  path: z.string().describe("Path to the content"),
  blockId: z.string().describe("ID of the block to update"),
  blockData: z.record(z.any()).describe("New block data"),
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

export default async function ploneUpdateSingleBlock(
  args: InferSchema<typeof schema>,
) {
  return ploneHandlersSingleton.handleUpdateBlock(args);
}

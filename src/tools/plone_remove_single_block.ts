import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { ploneHandlersSingleton } from "../plone-singleton";

export const schema = {
  path: z.string().describe("Path to the content"),
  blockId: z.string().describe("ID of the block to remove"),
};

export const metadata: ToolMetadata = {
  name: "plone_remove_single_block",
  description:
    "Deletes a single block from a content item, identified by its block ID. Example: plone_remove_single_block({path: '/my-page', blockId: 'abc123'})",
  annotations: {
    title: "Remove Single Block",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
  },
};

export default async function ploneRemoveSingleBlock(
  args: InferSchema<typeof schema>,
) {
  return ploneHandlersSingleton.handleRemoveBlock(args);
}

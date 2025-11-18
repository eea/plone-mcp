import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { ploneHandlersSingleton } from "../plone-singleton";
import { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types";
import { wrapError } from "../utils/block-utils";

export const schema = {
  path: z.string().describe("Path to the content to delete"),
};

export const metadata: ToolMetadata = {
  name: "plone_delete_content",
  description:
    "Permanently deletes a content item from Plone using its path. Example: plone_delete_content({path: '/old-content'})",
  annotations: {
    title: "Delete Plone Content",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
  },
};

export default async function ploneDeleteContent(
  args: InferSchema<typeof schema>,
): Promise<CallToolResult> {
  try {
    const { path } = args;
    const client = ploneHandlersSingleton.getClient();

    await client.delete(path);

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted content at path: ${path}`,
        },
      ],
    };
  } catch (error) {
    throw wrapError("DeleteContent", error);
  }
}

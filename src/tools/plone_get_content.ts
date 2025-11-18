import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { ploneHandlersSingleton } from "../plone-singleton";
import { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types";
import { wrapError } from "../utils/block-utils";

export const schema = {
  path: z
    .string()
    .describe(
      "Path to content (e.g., '/parentDocument/document' or just '/' for root level)",
    ),
  expand: z
    .array(z.string())
    .optional()
    .describe(
      "Components to expand (e.g., ['breadcrumbs', 'actions', 'workflow'])",
    ),
};

export const metadata: ToolMetadata = {
  name: "plone_get_content",
  description:
    "Retrieves the full JSON data for a single content item from Plone using its path. Example: plone_get_content({path: '/news/latest-update'})",
  annotations: {
    title: "Get Plone Content",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function ploneGetContent(
  args: InferSchema<typeof schema>,
): Promise<CallToolResult> {
  try {
    const { path, expand } = args;
    const client = ploneHandlersSingleton.getClient();

    const params: Record<string, any> = {};
    if (expand && expand.length > 0) {
      params.expand = expand.join(",");
    }

    const content = await client.get(path, params);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(content, null, 2),
        },
      ],
    };
  } catch (error) {
    throw wrapError("GetContent", error);
  }
}

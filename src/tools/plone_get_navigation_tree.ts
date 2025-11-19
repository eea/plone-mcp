import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { headers } from "xmcp/headers";
import { sessionManager } from "../session-manager";
import { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types";
import { wrapError } from "../utils/block-utils";
import { getSessionId } from "../utils/session";

export const schema = {
  root_path: z
    .string()
    .optional()
    .describe("Starting point for navigation tree (defaults to portal root)"),
  depth: z
    .number()
    .optional()
    .default(2)
    .describe("How deep to traverse in the navigation tree"),
};

export const metadata: ToolMetadata = {
  name: "plone_get_navigation_tree",
  description:
    "Get hierarchical navigation tree from any point in the site. Essential for understanding content organization and relationships. Example: plone_get_navigation_tree({root_path: '/documentation', depth: 3})",
  annotations: {
    title: "Get Navigation Tree",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function ploneGetNavigationTree(
  args: InferSchema<typeof schema>,
): Promise<CallToolResult> {
  try {
    const { root_path, depth } = args;
    const requestHeaders = headers();
    const sessionId = getSessionId(requestHeaders);
    const service = sessionManager.getSession(sessionId);
    const client = service.getClient();

    const normalizedRootPath =
      typeof root_path === "string" ? client.normalizePath(root_path) : "";

    const navigationPath = normalizedRootPath
      ? `${normalizedRootPath}/@navigation`
      : "/@navigation";

    // Build query parameters for navigation
    const params: Record<string, any> = {
      depth: typeof depth === "number" ? depth : 2,
    };

    // Use the @navigation endpoint
    const navigation = await client.get(navigationPath, params);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(navigation, null, 2),
        },
      ],
    };
  } catch (error) {
    throw wrapError("GetNavigationTree", error);
  }
}

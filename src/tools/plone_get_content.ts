import { z } from "zod";
import { headers } from "xmcp/headers";
import { sessionManager } from "plone-mcp/session-manager";

import { wrapError } from "plone-mcp/utils/block-utils";
import { getSessionId } from "plone-mcp/utils/session";
import type { InferSchema, ToolMetadata } from "xmcp";

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

interface PloneGetContentArgs {
  path: string;
  expand?: string[];
}

export default async function ploneGetContent(
  args: InferSchema<typeof schema> & PloneGetContentArgs,
): Promise<{ content: { type: "text"; text: string }[] }> {
  try {
    const { path, expand } = args;
    const requestHeaders = headers();
    const sessionId = getSessionId(requestHeaders);
    const service = sessionManager.getSession(sessionId);
    const client = service.getClient();

    const params: Record<string, unknown> = {};
    if (expand && expand.length > 0) {
      params.expand = expand.join(",");
    }

    const content = await client.get(path, params);

    const textContent = {
      type: "text" as const,
      text: JSON.stringify(content, null, 2),
    };

    return {
      content: [textContent],
    };
  } catch (error) {
    throw wrapError("GetContent", error);
  }
}

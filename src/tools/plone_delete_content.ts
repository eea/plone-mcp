import { z } from "zod";
import type { InferSchema, ToolMetadata } from "xmcp";
import { headers } from "xmcp/headers";
import { sessionManager } from "plone-mcp/session-manager";

import { wrapError } from "plone-mcp/utils/block-utils";
import { getSessionId } from "plone-mcp/utils/session";

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

interface PloneDeleteContentArgs {
  path: string;
}

export default async function ploneDeleteContent(
  args: InferSchema<typeof schema> & PloneDeleteContentArgs,
): Promise<{ content: { type: "text"; text: string }[] }> {
  try {
    const { path } = args;
    const requestHeaders = headers();
    const sessionId = getSessionId(requestHeaders);
    const service = sessionManager.getSession(sessionId);
    const client = service.getClient();

    await client.delete(path);

    const textContent = {
      type: "text" as const,
      text: `Successfully deleted content at path: ${path} `,
    };

    return {
      content: [textContent],
    };
  } catch (error) {
    throw wrapError("DeleteContent", error);
  }
}

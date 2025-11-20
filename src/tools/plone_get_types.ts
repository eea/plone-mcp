import type { InferSchema, ToolMetadata } from "xmcp";
import { headers } from "xmcp/headers";
import { sessionManager } from "plone-mcp/session-manager";

import { wrapError } from "plone-mcp/utils/block-utils";
import { getSessionId } from "plone-mcp/utils/session";

export const schema = {};

export const metadata: ToolMetadata = {
  name: "plone_get_types",
  description:
    "Lists all available content types that can be created in the Plone site (e.g., 'Document', 'Event').",
  annotations: {
    title: "Get Content Types",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function ploneGetTypes(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _args: InferSchema<typeof schema>,
): Promise<{ content: { type: "text"; text: string }[] }> {
  try {
    const requestHeaders = headers();
    const sessionId = getSessionId(requestHeaders);
    const service = sessionManager.getSession(sessionId);
    const client = service.getClient();
    const types = await client.get("/@types");

    const textContent = {
      type: "text" as const,
      text: JSON.stringify(types, null, 2),
    };

    return {
      content: [textContent],
    };
  } catch (error) {
    throw wrapError("GetTypes", error);
  }
}

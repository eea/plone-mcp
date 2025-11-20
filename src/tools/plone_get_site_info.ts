import type { InferSchema, ToolMetadata } from "xmcp";
import { headers } from "xmcp/headers";
import { sessionManager } from "plone-mcp/session-manager";

import { wrapError } from "plone-mcp/utils/block-utils";
import { getSessionId } from "plone-mcp/utils/session";

export const schema = {};

export const metadata: ToolMetadata = {
  name: "plone_get_site_info",
  description:
    "Retrieves top-level information and metadata about the connected Plone site, such as available languages and Plone version.",
  annotations: {
    title: "Get Site Information",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function ploneGetSiteInfo(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _args: InferSchema<typeof schema>,
): Promise<{ content: { type: "text"; text: string }[] }> {
  try {
    const requestHeaders = headers();
    const sessionId = getSessionId(requestHeaders);
    const service = sessionManager.getSession(sessionId);
    const client = service.getClient();
    const siteInfo = await client.get("/");

    const textContent = {
      type: "text" as const,
      text: JSON.stringify(siteInfo, null, 2),
    };

    return {
      content: [textContent],
    };
  } catch (error) {
    throw wrapError("GetSiteInfo", error);
  }
}

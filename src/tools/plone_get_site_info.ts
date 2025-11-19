import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { headers } from "xmcp/headers";
import { sessionManager } from "../session-manager";
import { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types";
import { wrapError } from "../utils/block-utils";
import { getSessionId } from "../utils/session";

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
  args: InferSchema<typeof schema>,
) {
  try {
    const requestHeaders = headers();
    const sessionId = getSessionId(requestHeaders);
    const service = sessionManager.getSession(sessionId);
    const client = service.getClient();
    const siteInfo = await client.get("/");

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(siteInfo, null, 2),
        },
      ],
    };
  } catch (error) {
    throw wrapError("GetSiteInfo", error);
  }
}

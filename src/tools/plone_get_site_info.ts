import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { ploneHandlersSingleton } from "../plone-singleton";
import { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types";
import { wrapError } from "../utils/block-utils";

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
  _args: InferSchema<typeof schema>,
): Promise<CallToolResult> {
  try {
    const client = ploneHandlersSingleton.getClient();
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

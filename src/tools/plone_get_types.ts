import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { ploneHandlersSingleton } from "../plone-singleton";
import { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types";
import { wrapError } from "../utils/block-utils";

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
  _args: InferSchema<typeof schema>,
): Promise<CallToolResult> {
  try {
    const client = ploneHandlersSingleton.getClient();
    const types = await client.get("/@types");

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(types, null, 2),
        },
      ],
    };
  } catch (error) {
    throw wrapError("GetTypes", error);
  }
}

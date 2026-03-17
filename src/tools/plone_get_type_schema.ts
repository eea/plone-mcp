import { z } from "zod";
import { headers } from "xmcp/headers";
import { sessionManager } from "plone-mcp/session-manager";
import { wrapError } from "plone-mcp/utils/block-utils";
import { getSessionId } from "plone-mcp/utils/session";
import type { InferSchema, ToolMetadata } from "xmcp";

export const schema = {
  contentType: z
    .string()
    .describe("Content type to get the schema for (e.g., 'Document')"),
};

export const metadata: ToolMetadata = {
  name: "plone_get_type_schema",
  description:
    "Gets the full JSON schema for a specific content type, including all fields, their types, required status, and validation rules. Use this to understand what fields are available when creating or updating content. Example: plone_get_type_schema({contentType: 'Document'})",
  annotations: {
    title: "Get Content Type Schema",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function ploneGetTypeSchema(
  args: InferSchema<typeof schema>,
): Promise<{ content: { type: "text"; text: string }[] }> {
  try {
    const requestHeaders = headers();
    const sessionId = getSessionId(requestHeaders);
    const service = sessionManager.getSession(sessionId);
    const client = service.getClient();
    const { contentType } = args;
    const typeSchema = await client.get(`/@types/${contentType}`);

    const textContent = {
      type: "text" as const,
      text: JSON.stringify(typeSchema, null, 2),
    };

    return {
      content: [textContent],
    };
  } catch (error) {
    throw wrapError("GetTypeSchema", error);
  }
}

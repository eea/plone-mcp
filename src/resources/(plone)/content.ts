import { z } from "zod";
import type { InferSchema, ResourceMetadata } from "xmcp";
import { headers } from "xmcp/headers";

import { sessionManager } from "plone-mcp/session-manager";
import { getSessionId } from "plone-mcp/utils/session";

// Define the input schema for the resource
export const schema = {
  path: z
    .union([z.string(), z.array(z.string())])
    .describe("The path to the Plone content item."),
};

// Define the resource metadata
export const metadata: ResourceMetadata = {
  name: "plone-content",
  title: "Plone Content Item",
  description:
    "Provides direct read-only access to the full JSON of a Plone content item via its path.",
};

// The default export is the handler function
export default async function handler(params: InferSchema<typeof schema>) {
  const sessionId = getSessionId(headers());
  const service = sessionManager.getSession(sessionId);
  const client = service.getClient();

  if (!client) {
    throw new Error(
      "Plone client not configured. (Resource handler needs access to the main server's configured PloneToolHandlers instance.)",
    );
  }

  const normalizedPath = client.normalizePath(
    typeof params.path === "string" ? params.path : params.path[0] || "",
  );
  const content = await client.get(normalizedPath);

  return {
    structuredContent: content,
  };
}

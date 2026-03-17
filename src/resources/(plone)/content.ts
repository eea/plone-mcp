import { z } from "zod";
import { headers } from "xmcp/headers";

import { sessionManager } from "plone-mcp/session-manager";
import { getSessionId } from "plone-mcp/utils/session";
import type { InferSchema, ResourceMetadata } from "xmcp";

// Define the input schema for the resource
export const schema = {
  path: z
    .union([z.string(), z.array(z.string())])
    .optional()
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

  // Robust path extraction from params
  let rawPath: string = "/";
  if (params && params.path) {
    if (typeof params.path === "string") {
      rawPath = params.path;
    } else if (Array.isArray(params.path) && params.path.length > 0) {
      rawPath = params.path[0];
    }
  }

  const normalizedPath = client.normalizePath(rawPath);
  
  try {
    const content = await client.get(normalizedPath);
    // xmcp requires ReadResourceResult format with a 'contents' array
    return {
      contents: [
        {
          uri: `plone://content${normalizedPath}`,
          mimeType: "application/json",
          text: JSON.stringify(content, null, 2),
        },
      ],
    };
  } catch (error: any) {
    console.error(`[Resource: plone-content] Error fetching path "${normalizedPath}":`, error.message);
    throw new Error(`Failed to fetch content at "${normalizedPath}": ${error.message}`);
  }
}

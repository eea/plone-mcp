interface Uri {
  href: string;
  // Add other properties if they are used and needed for type safety
}

import { z } from "zod"; // Not strictly needed for this resource, but good practice for consistency
import { type ResourceMetadata } from "xmcp"; // ResourceMetadata is still used
import { headers } from "xmcp/headers";

import { sessionManager } from "../../session-manager";

export const schema = z.object({}); // No specific parameters for this resource

export const metadata: ResourceMetadata = {
  name: "plone-types",
  title: "Plone Content Types",
  description:
    "Provides direct read-only access to the list of available content types.",
  resourceTemplate: "plone://types", // Direct URI string
};

export default async function handler(
  uri: Uri,
  params: z.infer<typeof schema>,
) {
  const sessionId = headers()?.get("mcp-session-id") || "default";
  const service = sessionManager.getSession(sessionId);
  const client = service.getClient();

  if (!client) {
    throw new Error(
      "Plone client not configured. (Resource handler needs access to the main server's configured PloneToolHandlers instance.)",
    );
  }

  const types = await client.get("/@types");

  return {
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify(types, null, 2),
        mimeType: "application/json",
      },
    ],
  };
}

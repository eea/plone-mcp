interface Uri {
  href: string;
  // Add other properties if they are used and needed for type safety
}

import { z } from "zod"; // Not strictly needed for this resource, but good practice for consistency
import { type ResourceTemplate, type ReadResourceResult } from "@modelcontextprotocol/sdk";
import { headers } from "xmcp/headers";
import { sessionManager } from "../../session-manager";
import { getSessionId } from "../../utils/session";

export const schema = z.object({}); // No specific parameters for this resource

export const metadata: ResourceTemplate = {
  name: "plone-site",
  title: "Plone Site Information",
  description:
    "Provides direct read-only access to the Plone site's root information object.",
  resourceTemplate: "plone://site", // Direct URI string
};

export default async function read(
  args: z.infer<typeof schema>,
): Promise<ReadResourceResult> {
  const sessionId = getSessionId(headers());
  const service = sessionManager.getSession(sessionId);
  const client = service.getClient();

  if (!client) {
    throw new Error(
      "Plone client not configured. (Resource handler needs access to the main server's configured PloneToolHandlers instance.)",
    );
  }

  const siteInfo = await client.get("/");

  return {
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify(siteInfo, null, 2),
        mimeType: "application/json",
      },
    ],
  };
}

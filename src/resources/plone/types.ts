import { z } from "zod";
import { type ResourceMetadata } from "xmcp";
import { headers } from "xmcp/headers";

import { sessionManager } from "../../session-manager";
import { getSessionId } from "../../utils/session";

export const schema = z.object({}); // No specific parameters for this resource

export const metadata: ResourceMetadata = {
  name: "plone-types",
  title: "Plone Content Types",
  description:
    "Provides direct read-only access to the list of available content types.",
};

export default async function handler() {
  const sessionId = getSessionId(headers());
  const service = sessionManager.getSession(sessionId);
  const client = service.getClient();

  if (!client) {
    throw new Error(
      "Plone client not configured. (Resource handler needs access to the main server's configured PloneToolHandlers instance.)",
    );
  }

  const types = await client.get("/@types");

  return {
    structuredContent: types,
  };
}

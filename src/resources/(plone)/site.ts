import { z } from "zod";
import { type ResourceMetadata } from "xmcp";
import { headers } from "xmcp/headers";
import { sessionManager } from "../../session-manager";
import { getSessionId } from "../../utils/session";

export const metadata: ResourceMetadata = {
  name: "plone-site",
  title: "Plone Site Information",
  description:
    "Provides direct read-only access to the Plone site's root information object.",
};

export default async function read() {
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
    structuredContent: siteInfo,
  };
}

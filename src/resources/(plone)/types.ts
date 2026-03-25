import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { sessionManager } from "../../session-manager.js";

export const ploneTypesResource = {
  config: {
    uri: "plone://types",
    name: "plone-types",
    description:
      "Provides direct read-only access to the list of available content types.",
    mimeType: "application/json",
  },
  handler: async (
    uri: URL,
    extra: RequestHandlerExtra<ServerRequest, ServerNotification>
  ) => {
    const sessionId = extra.sessionId || "default";
    const service = sessionManager.getSession(sessionId);
    const client = service.getClient();

    if (!client) {
      throw new Error("Plone client not configured.");
    }

    const types = await client.get("/@types");

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(types, null, 2),
        },
      ],
    };
  },
};

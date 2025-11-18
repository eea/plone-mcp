interface Uri {
  href: string;
  // Add other properties if they are used and needed for type safety
}

import { z } from "zod";
import { type InferSchema, type ResourceMetadata } from "xmcp";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ploneHandlersSingleton } from "../../plone-singleton.js";

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
  resourceTemplate: new ResourceTemplate("plone://{path}", { list: undefined }),
};

// The default export is the handler function
export default async function handler(
  uri: Uri,
  params: InferSchema<typeof schema>,
  // To access the Plone client, the resource handlers need to be
  // initialized with the `PloneToolHandlers` instance that holds the client.
  // This typically means the `PloneMCPServer` instance itself needs to
  // be passed or the client needs to be accessible globally or via context.
  // For now, we'll instantiate it here as a placeholder, but this needs
  // a more robust solution for the actual client configuration.
  // This will throw "Plone client not configured" until properly wired.
) {
  const { client } = ploneHandlersSingleton;

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
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify(content, null, 2),
        mimeType: "application/json",
      },
    ],
  };
}
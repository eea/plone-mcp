interface Uri {
  href: string;
  // Add other properties if they are used and needed for type safety
}

import { z } from "zod"; // Not strictly needed for this resource, but good practice for consistency
import { type InferSchema, type ResourceMetadata } from "xmcp";

import { ploneHandlersSingleton } from "../../plone-singleton";

export const schema = {}; // No specific parameters for this resource

export const metadata: ResourceMetadata = {
  name: "plone-site",
  title: "Plone Site Information",
  description:
    "Provides direct read-only access to the Plone site's root information object.",
  resourceTemplate: "plone://site", // Direct URI string
};

export default async function handler(
  uri: Uri,
  params: InferSchema<typeof schema>,
) {
  const { client } = ploneHandlersSingleton;

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

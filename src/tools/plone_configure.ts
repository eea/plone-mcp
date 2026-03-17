import { z } from "zod";
import { headers } from "xmcp/headers";
import { sessionManager } from "plone-mcp/session-manager";
import {
  ENV_BASE_URL,
  ENV_USERNAME,
  ENV_PASSWORD,
  ENV_TOKEN,
  PloneClient,
  Config,
} from "plone-mcp/plone-client";

import { wrapError } from "plone-mcp/utils/block-utils";
import { getSessionId } from "plone-mcp/utils/session";
import type { InferSchema, ToolMetadata } from "xmcp";

// Define the schema for tool parameters
// Using simple z.string().optional() to avoid Zod version compatibility issues
// with xmcp's bundled Zod when using chained .refine() on .optional()
export const schema = {
  baseUrl: z
    .string()
    .optional()
    .describe(
      "Base URL of the Plone site. Can be set via PLONE_BASE_URL environment variable.",
    ),
  username: z
    .string()
    .optional()
    .describe(
      "Username for authentication. Can be set via PLONE_USERNAME environment variable.",
    ),
  password: z
    .string()
    .optional()
    .describe(
      "Password for authentication. Can be set via PLONE_PASSWORD environment variable.",
    ),
  token: z
    .string()
    .optional()
    .describe(
      "JWT token for authentication (alternative to username/password). Can be set via PLONE_TOKEN environment variable.",
    ),
};

export const metadata: ToolMetadata = {
  name: "plone_configure",
  description:
    "Establishes and authenticates the connection to a Plone CMS. **Must be called once per session** before other tools can be used. Configuration can be provided via arguments or environment variables (PLONE_BASE_URL, PLONE_USERNAME, PLONE_PASSWORD, PLONE_TOKEN). Arguments take precedence over environment variables. To use environment variables only, call with an empty object: plone_configure({}). Example with arguments: plone_configure({baseUrl: 'https://demo.plone.org', username: 'admin', password: 'secret'}).",
  annotations: {
    title: "Configure Plone Connection",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  },
};

// Tool implementation
export default async function ploneConfigure(
  args: InferSchema<typeof schema>,
): Promise<{ content: { type: "text"; text: string }[] }> {
  const requestHeaders = headers();
  const sessionId = getSessionId(requestHeaders);
  const service = sessionManager.getSession(sessionId);

  // Build config from args and environment variables
  const config: Config = {
    baseUrl: args.baseUrl || process.env[ENV_BASE_URL],
    username: args.username || process.env[ENV_USERNAME],
    password: args.password || process.env[ENV_PASSWORD],
    token: args.token || process.env[ENV_TOKEN],
  };

  try {
    const client = new PloneClient(config);
    await client.get("/");
    service.client = client;

    const textContent = {
      type: "text" as const,
      text: `Successfully configured connection to Plone site: ${client.baseUrl}`,
    };
    return { content: [textContent] };
  } catch (error) {
    // If configuration fails, we might want to clear the client from the session
    // But since we get the service from the session, we can just set client to null
    service.client = null;

    throw wrapError("Configure", error);
  }
}

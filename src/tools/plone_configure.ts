import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { headers } from "xmcp/headers";
import { sessionManager } from "../session-manager";
import {
  ENV_BASE_URL,
  ENV_USERNAME,
  ENV_PASSWORD,
  ENV_TOKEN,
  isValidUrl,
  PloneClient,
  optionalNonEmpty,
} from "../plone-client";
import { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types";
import { wrapError } from "../utils/block-utils";
import { getSessionId } from "../utils/session";

// Define the schema for tool parameters
export const schema = {
  baseUrl: optionalNonEmpty(ENV_BASE_URL)
    .refine((val) => !val || isValidUrl(val), {
      message: "Must be a valid URL (e.g., https://example.com)",
    })
    .describe(
      "Base URL of the Plone site. Can be set via PLONE_BASE_URL environment variable.",
    ),
  username: optionalNonEmpty(ENV_USERNAME).describe(
    "Username for authentication. Can be set via PLONE_USERNAME environment variable.",
  ),
  password: optionalNonEmpty(ENV_PASSWORD).describe(
    "Password for authentication. Can be set via PLONE_PASSWORD environment variable.",
  ),
  token: optionalNonEmpty(ENV_TOKEN).describe(
    "JWT token for authentication (alternative to username/password). Can be set via PLONE_TOKEN environment variable.",
  ),
};

// Define tool metadata
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
): Promise<CallToolResult> {
  let client: PloneClient | null = null;
  const requestHeaders = headers();
  const sessionId = getSessionId(requestHeaders);
  const service = sessionManager.getSession(sessionId);

  try {
    client = new PloneClient(args);
    await client.get("/");
    service.client = client;

    const textContent: TextContent = {
      type: "text",
      text: `Successfully configured connection to Plone site: ${client.baseUrl}`,
    };
    return { content: [textContent] };
  } catch (error) {
    // If configuration fails, we might want to clear the client from the session
    // But since we get the service from the session, we can just set client to null
    const requestHeaders = headers();
    const sessionId = getSessionId(requestHeaders);
    const service = sessionManager.getSession(sessionId);
    service.client = null;

    throw wrapError("Configure", error);
  }
}

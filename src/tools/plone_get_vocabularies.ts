import { z } from "zod";
import { headers } from "xmcp/headers";
import { sessionManager } from "plone-mcp/session-manager";

import { wrapError } from "plone-mcp/utils/block-utils";
import { getSessionId } from "plone-mcp/utils/session";
import type { InferSchema, ToolMetadata } from "xmcp";

export const schema = {
  vocabulary: z.string().describe("Vocabulary name"),
  title: z.string().optional().describe("Filter by title"),
  token: z.string().optional().describe("Filter by token"),
};

export const metadata: ToolMetadata = {
  name: "plone_get_vocabularies",
  description:
    "Fetches the allowed values for a specific field, such as a list of categories or tags. Useful for finding valid inputs for content fields. Example: plone_get_vocabularies({vocabulary: 'plone.app.vocabularies.Keywords'})",
  annotations: {
    title: "Get Vocabulary Values",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

interface PloneGetVocabulariesArgs {
  vocabulary: string;
  title?: string;
  token?: string;
}

export default async function ploneGetVocabularies(
  args: InferSchema<typeof schema> & PloneGetVocabulariesArgs,
): Promise<{ content: { type: "text"; text: string }[] }> {
  try {
    const parsedArgs = args;
    const requestHeaders = headers();
    const sessionId = getSessionId(requestHeaders);
    const service = sessionManager.getSession(sessionId);
    const client = service.getClient();
    const { vocabulary, title, token } = parsedArgs;

    const params: Record<string, unknown> = {};
    if (title) params.title = title;
    if (token) params.token = token;

    const vocabularies = await client.get(
      `/@vocabularies/${vocabulary}`,
      params,
    );

    const textContent = {
      type: "text" as const,
      text: JSON.stringify(vocabularies, null, 2),
    };

    return {
      content: [textContent],
    };
  } catch (error) {
    throw wrapError("GetVocabularies", error);
  }
}

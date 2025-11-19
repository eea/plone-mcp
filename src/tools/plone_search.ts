import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { headers } from "xmcp/headers";
import { sessionManager } from "../session-manager";

import { wrapError } from "../utils/block-utils";
import { getSessionId } from "../utils/session";

export const schema = {
  query: z.string().optional().describe("Search query text"),
  portal_type: z
    .array(z.string())
    .optional()
    .describe("Content types to search for"),
  path: z.string().optional().describe("Path to search within"),
  review_state: z
    .array(z.string())
    .optional()
    .describe("Workflow states to filter by"),
  sort_on: z
    .string()
    .optional()
    .describe(
      "Field to sort by (e.g., 'modified', 'created', 'sortable_title')",
    ),
  sort_order: z
    .enum(["ascending", "descending"])
    .optional()
    .describe("Sort order"),
  b_size: z
    .number()
    .optional()
    .describe("Batch size (number of results per page)"),
  b_start: z.number().optional().describe("Batch start (for pagination)"),
};

export const metadata: ToolMetadata = {
  name: "plone_search",
  description:
    "Performs a detailed search for content items, allowing filters by text, content type, path, and workflow state. Example: plone_search({query: 'annual report', portal_type: ['Document'], review_state: ['published']})",
  annotations: {
    title: "Search Plone Content",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

interface PloneSearchArgs {
  query?: string;
  portal_type?: string[];
  path?: string;
  review_state?: string[];
  sort_on?: string;
  sort_order?: "ascending" | "descending";
  b_size?: number;
  b_start?: number;
}

export default async function ploneSearch(
  args: InferSchema<typeof schema> & PloneSearchArgs,
): Promise<{ content: { type: "text"; text: string }[] }> {
  try {
    const parsedArgs = args;
    const requestHeaders = headers();
    const sessionId = getSessionId(requestHeaders);
    const service = sessionManager.getSession(sessionId);
    const client = service.getClient();
    const {
      query,
      portal_type,
      path,
      review_state,
      sort_on,
      sort_order,
      b_size,
      b_start,
    } = parsedArgs;

    const params: Record<string, unknown> = {};

    if (query) params.SearchableText = query;
    if (portal_type) params.portal_type = portal_type;
    if (path) params.path = path;
    if (review_state) params.review_state = review_state;
    if (sort_on) params.sort_on = sort_on;
    if (sort_order) params.sort_order = sort_order;
    if (typeof b_size !== "undefined") params.b_size = b_size;
    if (typeof b_start !== "undefined") params.b_start = b_start;

    const results = await client.get("/@search", params);

    const textContent = {
      type: "text" as const,
      text: JSON.stringify(results, null, 2),
    };

    return {
      content: [textContent],
    };
  } catch (error) {
    throw wrapError("Search", error);
  }
}

import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { headers } from "xmcp/headers";
import { sessionManager } from "../session-manager";
import { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types";
import { wrapError } from "../utils/block-utils";
import { getSessionId } from "../utils/session";

export const schema = {
  path: z.string().describe("Path to the content"),
  transition: z.string().describe("Workflow transition to execute"),
  comment: z.string().optional().describe("Comment for the transition"),
};

export const metadata: ToolMetadata = {
  name: "plone_transition_workflow",
  description:
    "Changes the workflow state of a content item by executing a specific transition, like 'publish' or 'submit'. Example: plone_transition_workflow({path: '/my-document', transition: 'publish'})",
  annotations: {
    title: "Execute Workflow Transition",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
};

export default async function ploneTransitionWorkflow(
  args: InferSchema<typeof schema>,
): Promise<CallToolResult> {
  try {
    const requestHeaders = headers();
    const sessionId = getSessionId(requestHeaders);
    const service = sessionManager.getSession(sessionId);
    const client = service.getClient();

    const { path, transition, comment } = args;

    const data: any = { transition };
    if (comment) data.comment = comment;

    const result = await client.post(`${path}/@workflow/${transition}`, data);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    throw wrapError("TransitionWorkflow", error);
  }
}

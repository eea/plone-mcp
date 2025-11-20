import { z } from "zod";
import type { InferSchema, ToolMetadata } from "xmcp";
import { headers } from "xmcp/headers";
import { sessionManager } from "plone-mcp/session-manager";
import { wrapError } from "plone-mcp/utils/block-utils";
import { getSessionId } from "plone-mcp/utils/session";

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

interface PloneTransitionWorkflowArgs {
  path: string;
  transition: string;
  comment?: string;
}

export default async function ploneTransitionWorkflow(
  args: InferSchema<typeof schema> & PloneTransitionWorkflowArgs,
): Promise<{ content: { type: "text"; text: string }[] }> {
  try {
    const requestHeaders = headers();
    const sessionId = getSessionId(requestHeaders);
    const service = sessionManager.getSession(sessionId);
    const client = service.getClient();

    const { path, transition, comment } = args;

    const data: Record<string, unknown> = { transition };
    if (comment) data.comment = comment;

    const result = await client.post(`${path}/@workflow/${transition}`, data);

    const textContent = {
      type: "text" as const,
      text: JSON.stringify(result, null, 2),
    };

    return {
      content: [textContent],
    };
  } catch (error) {
    throw wrapError("TransitionWorkflow", error);
  }
}

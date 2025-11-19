import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { headers } from "xmcp/headers";
import { sessionManager } from "../session-manager";
import { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types";
import { wrapError } from "../utils/block-utils";
import { getSessionId } from "../utils/session";

export const schema = {
  path: z.string().describe("Path to the content"),
};

export const metadata: ToolMetadata = {
  name: "plone_get_workflow_info",
  description:
    "Shows the current workflow state (e.g., 'Published', 'Private') and available transitions for a content item. Example: plone_get_workflow_info({path: '/my-document'})",
  annotations: {
    title: "Get Workflow Information",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

interface PloneGetWorkflowInfoArgs {
  path: string;
}

export default async function ploneGetWorkflowInfo(
  args: InferSchema<typeof schema> & PloneGetWorkflowInfoArgs,
): Promise<CallToolResult> {
  try {
    const { path } = args;
    const requestHeaders = headers();
    const sessionId = getSessionId(requestHeaders);
    const service = sessionManager.getSession(sessionId);
    const client = service.getClient();

    const workflow = await client.get(`${path}/@workflow`);

    const textContent: TextContent = {
      type: "text",
      text: JSON.stringify(workflow, null, 2),
    };

    return {
      content: [textContent],
    };
  } catch (error) {
    throw wrapError("GetWorkflowInfo", error);
  }
}

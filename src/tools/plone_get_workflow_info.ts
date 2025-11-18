import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { ploneHandlersSingleton } from "../plone-singleton";

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

export default async function ploneGetWorkflowInfo(
  args: InferSchema<typeof schema>,
) {
  return ploneHandlersSingleton.handleGetWorkflowInfo(args);
}

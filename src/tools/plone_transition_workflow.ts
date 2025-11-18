import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { ploneHandlersSingleton } from "../plone-singleton.js";

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
) {
  return ploneHandlersSingleton.handleTransitionWorkflow(args);
}

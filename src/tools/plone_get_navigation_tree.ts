import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { ploneHandlersSingleton } from "../plone-singleton.js";

export const schema = {
  root_path: z
    .string()
    .optional()
    .describe("Starting point for navigation tree (defaults to portal root)"),
  depth: z
    .number()
    .optional()
    .default(2)
    .describe("How deep to traverse in the navigation tree"),
};

export const metadata: ToolMetadata = {
  name: "plone_get_navigation_tree",
  description:
    "Get hierarchical navigation tree from any point in the site. Essential for understanding content organization and relationships. Example: plone_get_navigation_tree({root_path: '/documentation', depth: 3})",
  annotations: {
    title: "Get Navigation Tree",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function ploneGetNavigationTree(
  args: InferSchema<typeof schema>,
) {
  return ploneHandlersSingleton.handleGetNavigationTree(args);
}

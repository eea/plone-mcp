import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { ploneHandlersSingleton } from "../plone-singleton";

export const schema = {};

export const metadata: ToolMetadata = {
  name: "plone_get_types",
  description:
    "Lists all available content types that can be created in the Plone site (e.g., 'Document', 'Event').",
  annotations: {
    title: "Get Content Types",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function ploneGetTypes(args: InferSchema<typeof schema>) {
  return ploneHandlersSingleton.handleGetTypes(args);
}

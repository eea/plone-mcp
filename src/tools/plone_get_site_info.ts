import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { ploneHandlersSingleton } from "../plone-singleton.js";

export const schema = {};

export const metadata: ToolMetadata = {
  name: "plone_get_site_info",
  description:
    "Retrieves top-level information and metadata about the connected Plone site, such as available languages and Plone version.",
  annotations: {
    title: "Get Site Information",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function ploneGetSiteInfo(
  args: InferSchema<typeof schema>,
) {
  return ploneHandlersSingleton.handleGetSiteInfo(args);
}

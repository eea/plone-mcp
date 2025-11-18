import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { ploneHandlersSingleton } from "../plone-singleton";

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

export default async function ploneGetVocabularies(
  args: InferSchema<typeof schema>,
) {
  return ploneHandlersSingleton.handleGetVocabularies(args);
}

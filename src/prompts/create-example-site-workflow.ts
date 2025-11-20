import { z } from "zod";
import type { InferSchema, PromptMetadata } from "xmcp";

export const schema = {
  contentTypes: z
    .string()
    .describe("Types of content to create (e.g., 'Documents, News Items')"),
  purpose: z.string().describe("The overall theme or topic of the site"),
  audience: z.string().optional().describe("The target audience for the site"),
  numberOfPages: z
    .string()
    .optional()
    .describe("The number of pages to create (default is 3)"),
};

export const metadata: PromptMetadata = {
  name: "create-example-site-workflow",
  title: "Create a Multi-Page Example Site",
  description:
    "A guided workflow to create a small, multi-page example website with interconnected content.",
  role: "user",
};

export default function createExampleSiteWorkflow({
  contentTypes,
  purpose,
  numberOfPages = "3",
  audience,
}: InferSchema<typeof schema>) {
  return `My goal is to create an example site with ${numberOfPages} pages of type ${contentTypes}, all centered around the theme of "${purpose}"${
    audience ? `, aimed at an audience of ${audience}` : ""
  }. Follow this plan:

1.  Ensure the Plone connection is configured.
2.  Establish a logical folder (Document type objects can be used as folders) structure for the new pages.
3.  Create each of the ${numberOfPages} pages with appropriate titles, descriptions, and content.
4.  Populate each page with relevant and structured content blocks.
5.  Ensure all created pages are published.

Begin this process step-by-step.`;
}

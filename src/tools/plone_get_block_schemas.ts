import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { headers } from "xmcp/headers";
import { sessionManager } from "../session-manager";
import { blockRegistry } from "../block-registry"; // Already imported
import { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types";
import { wrapError, getBlockExample } from "../utils/block-utils"; // Added getBlockExample
import { getSessionId } from "../utils/session";

export const schema = {
  blockType: z
    .enum(blockRegistry.getBlockTypesEnum())
    .optional()
    .describe(
      "Specific block type to get schema for (optional, returns all if not specified).",
    ),
};

export const metadata: ToolMetadata = {
  name: "plone_get_block_schemas",
  description:
    "Lists all available Volto block types (e.g., 'slate', 'teaser', 'button') and their required data schemas. **Essential for understanding how to construct blocks.** Example: plone_get_block_schemas({blockType: 'teaser'})",
  annotations: {
    title: "Get Block Schemas",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function ploneGetBlockSchemas(
  args: InferSchema<typeof schema>,
): Promise<CallToolResult> {
  const requestHeaders = headers();
  const sessionId = getSessionId(requestHeaders);
  const service = sessionManager.getSession(sessionId);
  try {
    const { blockType } = args;

    if (blockType && blockType !== "") {
      const spec = blockRegistry.getSpecification(blockType);
      if (!spec) {
        throw new Error(
          `Unknown block type: ${blockType}. Available types: ${blockRegistry
            .getBlockTypes()
            .join(", ")
          } `,
        );
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                blockType: blockType,
                specification: spec,
                example: getBlockExample(blockType),
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    // Return all block schemas with examples
    const examples: Record<string, any> = {};
    for (const type of blockRegistry.getBlockTypes()) {
      examples[type] = getBlockExample(type);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              availableTypes: blockRegistry.getBlockTypes(),
              specifications: blockRegistry.getSpecifications(),
              examples: examples,
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error) {
    throw wrapError("GetBlockSchemas", error);
  }
}

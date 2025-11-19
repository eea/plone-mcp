import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { blockRegistry } from "plone-mcp/block-registry";

import { wrapError, getBlockExample } from "plone-mcp/utils/block-utils";

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

interface PloneGetBlockSchemasArgs {
  blockType?: string;
}

export default async function ploneGetBlockSchemas(
  args: InferSchema<typeof schema> & PloneGetBlockSchemasArgs,
): Promise<{ content: { type: "text"; text: string }[] }> {
  try {
    const { blockType } = args;

    if (blockType && blockType !== "") {
      const spec = blockRegistry.getSpecification(blockType);
      if (!spec) {
        throw new Error(
          `Unknown block type: ${blockType}. Available types: ${blockRegistry
            .getBlockTypes()
            .join(", ")} `,
        );
      }

      const textContent = {
        type: "text" as const,
        text: JSON.stringify(
          {
            blockType: blockType,
            specification: spec,
            example: getBlockExample(blockType),
          },
          null,
          2,
        ),
      };

      return {
        content: [textContent],
      };
    }

    // Return all block schemas with examples
    const examples: Record<string, unknown> = {};
    for (const type of blockRegistry.getBlockTypes()) {
      examples[type] = getBlockExample(type);
    }

    const textContent = {
      type: "text" as const,
      text: JSON.stringify(
        {
          availableTypes: blockRegistry.getBlockTypes(),
          specifications: blockRegistry.getSpecifications(),
          examples: examples,
        },
        null,
        2,
      ),
    };

    return {
      content: [textContent],
    };
  } catch (error) {
    throw wrapError("GetBlockSchemas", error);
  }
}

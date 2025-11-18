import "isomorphic-fetch";
import { z } from "zod";
import {
  PloneClient,
  PloneContent,
} from "./plone-client.js";
import { blockRegistry } from "./block-registry.js";
import {
  CallToolResult,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { markdownParse } from "./markdown-parser.js";
import { v4 as uuidv4 } from "uuid";

// =============================================================================
// TOOL HANDLERS - Configuration and Content Management
// =============================================================================

export function wrapError(operation: string, error: unknown): Error {
  if (error instanceof z.ZodError) {
    return new Error(`[${operation}] Invalid parameters: ${error.message}`);
  }
  return new Error(
    `[${operation}] ${error instanceof Error ? error.message : String(error)}`,
  );
}

export function generateBlockId(): string {
  return uuidv4();
}

// Validate if the url is an image address, to avoid creation of blank image blocks
export async function validateImageURL(url: string): Promise<boolean> {
  try {
    // For data URLs, check MIME type
    if (url.startsWith("data:")) {
      return url.startsWith("data:image/");
    }

    // For external URLs
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        Accept: "image/*",
      },
    });

    if (!response.ok) {
      return false;
    }

    const contentType = response.headers.get("Content-Type");
    return contentType ? contentType.startsWith("image/") : false;
  } catch (error) {
    console.error(`Error validating image URL ${url}:`, error);
    return false;
  }
}

/**
 * Process a block
 */
export function processBlock(
  blockType: string,
  blockData: Record<string, any>,
): Record<string, any> {
  if (blockType === "slate" || blockType === "text") {
    // Convert text block to Slate format
    const textContent = blockData.text || "";
    return {
      "@type": "slate",
      plaintext: textContent,
      value: markdownParse(textContent),
      theme: blockData.theme || "default",
    };
  } else if (blockType === "image") {
    // Basic validation for required fields
    if (
      !blockData ||
      typeof blockData.url !== "string" ||
      blockData.url.trim() === ""
    ) {
      throw wrapError(
        "ProcessBlock",
        `Missing or invalid image URL: ${String(blockData?.url)}`,
      );
    }
    return {
      ...blockData,
      "@type": "image",
    };
  } else if (blockType === "teaser" || blockType === "__button") {
    // Transform href to required array format if it's a string
    const processedData: Record<string, any> = {
      ...blockData,
      "@type": blockType,
    };

    if (blockData.href) {
      if (typeof blockData.href === "string") {
        // Convert string href to required array format
        processedData.href = [{ "@id": blockData.href }];
      } else if (Array.isArray(blockData.href)) {
        // Already in array format, keep as-is
        processedData.href = blockData.href;
      } else {
        throw wrapError(
          "ProcessBlock",
          `Invalid href format for ${blockType} block. Expected string or array, got: ${typeof blockData.href}`,
        );
      }
    }

    return processedData;
  } else {
    return {
      ...blockData,
      "@type": blockType,
    };
  }
}

/**
 * Get example block data for documentation
 */
export function getBlockExample(blockType: string): any {
  const examples: Record<string, any> = {
    teaser: {
      href: [
        {
          "@id": "https://example.com/news/latest-updates",
        },
      ],
      overwrite: true,
      title: "Latest Company Updates",
      head_title: "News",
      description: "Read about our recent achievements and announcements",
      preview_image: [
        {
          "@id": "https://example.com/images/latest-updates-preview.jpg",
          image_field: "image",
        },
      ],
      theme: "default",
      styles: {
        align: "left",
      },
    },
    slate: {
      text: "This is a paragraph of text content that will be converted to Slate format.",
      theme: "default",
    },
    __button: {
      href: [{ "@id": "https://example.com/contact", title: "Contact Page" }],
      title: "Contact Us",
      theme: "default",
      styles: {
        "align:noprefix": {
          "--block-alignment": "var(--align-center)",
        },
        "blockWidth:noprefix": {
          "--block-width": "var(--default-container-width)",
        },
      },
    },
    separator: {
      theme: "default",
      styles: {
        "align:noprefix": {
          "--block-alignment": "var(--align-left)",
        },
        "blockWidth:noprefix": {
          "--block-width": "var(--narrow-container-width)",
        },
        shortLine: true,
      },
    },
    image: {
      url: "https:/example.com/images/logo.png",
      alt: "Logo",
    },
  };

  return examples[blockType] || {};
}

export class PloneToolHandlers {
  public client: PloneClient | null = null;
  private preparedBlocks: {
    blocks: Record<string, any>;
    blocks_layout: { items: string[] };
    timestamp: number;
  } | null = null;
  private readonly PREPARED_BLOCKS_TTL = 60000; // 60 seconds TTL



  constructor(client: PloneClient | null) {
    this.client = client;
  }

  private requireClient(): PloneClient {
    if (!this.client) {
      throw new Error(
        "Plone client not configured. Please run plone_configure first.",
      );
    }
    return this.client;
  }

  // IMPROVEMENT: Check for expired prepared blocks
  private isExpiredPreparedBlocks(): boolean {
    if (!this.preparedBlocks) return true;
    return (
      Date.now() - this.preparedBlocks.timestamp > this.PREPARED_BLOCKS_TTL
    );
  }

  /**
   * Centralized logic for processing blocks and layout for create/update operations.
   * It handles blocks from direct arguments, prepared state, or defaults.
   * It also enforces that a title block exists and is the first item in the layout.
   * @param blocks - Blocks from tool arguments.
   * @param blocks_layout - Blocks layout from tool arguments.
   * @param isUpdate - Flag to indicate if this is for an update operation, which has slightly different rules.
   * @returns An object with final blocks and layout, or null if no block operations should occur.
   */
  private _handleBlockProcessing(
    blocks: Record<string, any> | undefined,
    blocks_layout: Record<string, any> | undefined,
    isUpdate: boolean = false,
  ): {
    blocks: Record<string, any>;
    blocks_layout: { items: string[] };
  } | null {
    // Determine if we should process blocks at all
    const hasProvidedBlocks = blocks || blocks_layout;
    const hasPreparedBlocks =
      this.preparedBlocks !== null && !this.isExpiredPreparedBlocks();

    if (!hasProvidedBlocks && !hasPreparedBlocks) {
      // For updates, if no blocks are provided, do nothing.
      // For creates, we will add a default title block later.
      if (isUpdate) {
        return null;
      }
    }

    // Use prepared blocks if available and not expired, otherwise use provided args
    let finalBlocks: Record<string, any>;
    let finalLayout: string[];

    if (hasPreparedBlocks && this.preparedBlocks) {
      finalBlocks = this.preparedBlocks.blocks;
      finalLayout = this.preparedBlocks.blocks_layout.items;
    } else {
      finalBlocks = blocks || {};
      finalLayout = blocks_layout?.items || Object.keys(finalBlocks);
    }

    // Always clear prepared blocks after they are consumed
    this.preparedBlocks = null;

    // Find the existing title block
    let titleBlockId = finalLayout.find(
      (id: string) => finalBlocks[id]?.["@type"] === "title",
    );

    if (!titleBlockId) {
      // If no title block exists, create one and add it to the front
      titleBlockId = generateBlockId();
      finalLayout.unshift(titleBlockId);
    } else if (finalLayout[0] !== titleBlockId) {
      // If it exists but isn't first, move it to the front
      finalLayout = finalLayout.filter((id: string) => id !== titleBlockId);
      finalLayout.unshift(titleBlockId);
    }

    // ALWAYS ensure the title block is clean and contains only the @type
    finalBlocks[titleBlockId] = { "@type": "title" };

    return {
      blocks: finalBlocks,
      blocks_layout: { items: finalLayout },
    };
  }

  public async handleConfigure(args: any): Promise<CallToolResult> {
    try {
      const config = args;
      this.client = new PloneClient(config);

      // Test the connection
      await this.client.get("/");

      const textContent: TextContent = {
        type: "text",
        text: `Successfully configured connection to Plone site: ${config.baseUrl}`,
      };
      return { content: [textContent] };
    } catch (error) {
      throw wrapError("Configure", error);
    }
  }

  public async handleGetContent(args: any): Promise<CallToolResult> {
    try {
      const { path, expand } = args;
      const client = this.requireClient();

      const params: Record<string, any> = {};
      if (expand && expand.length > 0) {
        params.expand = expand.join(",");
      }

      const content = await client.get(path, params);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(content, null, 2),
          },
        ],
      };
    } catch (error) {
      throw wrapError("GetContent", error);
    }
  }

  public async handleCreateContent(args: any): Promise<CallToolResult> {
    try {
      const parsedArgs = args;
      const client = this.requireClient();
      const {
        parentPath,
        type,
        title,
        description,
        id,
        blocks,
        blocks_layout,
        additionalFields,
      } = parsedArgs;

      const data: any = {
        "@type": type,
        title,
      };

      if (description) data.description = description;
      if (id) data.id = id;

      // Use the centralized helper to process blocks
      const blockData = this._handleBlockProcessing(
        blocks,
        blocks_layout,
        false,
      );
      if (blockData) {
        data.blocks = blockData.blocks;
        data.blocks_layout = blockData.blocks_layout;
      }

      if (additionalFields) Object.assign(data, additionalFields);

      const content = await client.post(parentPath, data);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(content, null, 2),
          },
        ],
      };
    } catch (error) {
      // Ensure prepared blocks are cleared on any error
      if (this.preparedBlocks) {
        this.preparedBlocks = null;
      }
      throw wrapError("CreateContent", error);
    }
  }

  public async handleUpdateContent(args: any): Promise<CallToolResult> {
    try {
      const parsedArgs = args;
      const client = this.requireClient();
      const {
        path,
        title,
        description,
        blocks,
        blocks_layout,
        additionalFields,
      } = parsedArgs;

      if (!path) {
        throw new Error("Path is required for updating content");
      }

      const data: any = {};
      if (title !== undefined) data.title = title;
      if (description !== undefined) data.description = description;

      // Use the centralized helper, which will return null if no block changes are needed
      const blockData = this._handleBlockProcessing(
        blocks,
        blocks_layout,
        true,
      );
      if (blockData) {
        data.blocks = blockData.blocks;
        data.blocks_layout = blockData.blocks_layout;
      }

      if (additionalFields) Object.assign(data, additionalFields);

      if (Object.keys(data).length === 0) {
        throw new Error("No changes specified for update");
      }

      const content = await client.patch(path, data);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(content, null, 2),
          },
        ],
      };
    } catch (error) {
      if (this.preparedBlocks) {
        this.preparedBlocks = null;
      }
      throw wrapError("UpdateContent", error);
    }
  }

  public async handleDeleteContent(args: any): Promise<CallToolResult> {
    try {
      const { path } = args;
      const client = this.requireClient();

      await client.delete(path);

      return {
        content: [
          {
            type: "text",
            text: `Successfully deleted content at path: ${path}`,
          },
        ],
      };
    } catch (error) {
      throw wrapError("DeleteContent", error);
    }
  }

  public async handleSearch(args: any): Promise<CallToolResult> {
    try {
      const parsedArgs = args;
      const client = this.requireClient();
      const {
        query,
        portal_type,
        path,
        review_state,
        sort_on,
        sort_order,
        b_size,
        b_start,
      } = parsedArgs;

      const params: Record<string, any> = {};

      if (query) params.SearchableText = query;
      if (portal_type) params.portal_type = portal_type;
      if (path) params.path = path;
      if (review_state) params.review_state = review_state;
      if (sort_on) params.sort_on = sort_on;
      if (sort_order) params.sort_order = sort_order;
      if (b_size) params.b_size = b_size;
      if (b_start) params.b_start = b_start;

      const results = await client.get("/@search", params);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } catch (error) {
      throw wrapError("Search", error);
    }
  }

  public async handleGetSiteInfo(_args: unknown): Promise<CallToolResult> {
    try {
      const client = this.requireClient();
      const siteInfo = await client.get("/");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(siteInfo, null, 2),
          },
        ],
      };
    } catch (error) {
      throw wrapError("GetSiteInfo", error);
    }
  }

  public async handleGetTypes(_args: unknown): Promise<CallToolResult> {
    try {
      const client = this.requireClient();
      const types = await client.get("/@types");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(types, null, 2),
          },
        ],
      };
    } catch (error) {
      throw wrapError("GetTypes", error);
    }
  }

  public async handleGetVocabularies(args: any): Promise<CallToolResult> {
    try {
      const parsedArgs = args;
      const client = this.requireClient();
      const { vocabulary, title, token } = parsedArgs;

      const params: Record<string, any> = {};
      if (title) params.title = title;
      if (token) params.token = token;

      const vocabularies = await client.get(
        `/@vocabularies/${vocabulary}`,
        params,
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(vocabularies, null, 2),
          },
        ],
      };
    } catch (error) {
      throw wrapError("GetVocabularies", error);
    }
  }

  public async handleGetWorkflowInfo(args: any): Promise<CallToolResult> {
    try {
      const { path } = args;
      const client = this.requireClient();

      const workflow = await client.get(`${path}/@workflow`);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(workflow, null, 2),
          },
        ],
      };
    } catch (error) {
      throw wrapError("GetWorkflowInfo", error);
    }
  }

  public async handleTransitionWorkflow(args: any): Promise<CallToolResult> {
    try {
      const { path, transition, comment } = args;
      const client = this.requireClient();

      const data: any = { transition };
      if (comment) data.comment = comment;

      const result = await client.post(`${path}/@workflow/${transition}`, data);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      throw wrapError("TransitionWorkflow", error);
    }
  }

  public async handleGetBlockSchemas(args: any): Promise<CallToolResult> {
    try {
      const { blockType } = args;

      if (blockType && blockType !== "") {
        const spec = blockRegistry.getSpecification(blockType);
        if (!spec) {
          throw new Error(
            `Unknown block type: ${blockType}. Available types: ${blockRegistry
              .getBlockTypes()
              .join(", ")}`,
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

  public async handleCreateBlocksLayout(args: any): Promise<CallToolResult> {
    try {
      const { blocks } = args;

      const processedBlocks: Record<string, any> = {};
      const blockIds: string[] = [];
      const blockInfo: Array<{ id: string; type: string }> = [];

      // Process each block in the array
      for (const blockSpec of blocks) {
        // Validate image URLs asynchronously before processing
        if (blockSpec.type === "image" && blockSpec.data?.url) {
          const isValid = await validateImageURL(blockSpec.data.url);
          if (!isValid) {
            throw wrapError(
              "CreateBlocksLayout",
              `Invalid or inaccessible image URL: ${blockSpec.data.url}`,
            );
          }
        }

        const blockId = generateBlockId();
        const processedBlock = processBlock(blockSpec.type, blockSpec.data);

        processedBlocks[blockId] = processedBlock;
        blockIds.push(blockId);
        blockInfo.push({ id: blockId, type: blockSpec.type });
      }

      // Store the prepared blocks for immediate use with timestamp
      this.preparedBlocks = {
        blocks: processedBlocks,
        blocks_layout: { items: blockIds },
        timestamp: Date.now(),
      };

      return {
        content: [
          {
            type: "text" as const,
            text: `Successfully prepared ${
              blocks.length
            } blocks for next create/update operation (valid for 60 seconds). Blocks ready: ${blockInfo
              .map((block) => `${block.type}:[${block.id}]`)
              .join(", ")}`,
          },
        ],
      };
    } catch (error) {
      // Clear prepared blocks on error
      this.preparedBlocks = null;
      throw wrapError("CreateBlocksLayout", error);
    }
  }

  public async handleAddBlock(args: any): Promise<CallToolResult> {
    try {
      const { path, blockType, blockData, position } = args;
      const client = this.requireClient();

      // First get the current content
      const content: PloneContent = await client.get(path);

      const blocks = content.blocks || {};
      const blocks_layout = content.blocks_layout || { items: [] };

      // Generate new block ID
      const blockId = generateBlockId();

      // Validate image URLs asynchronously before processing
      if (blockType === "image" && blockData?.url) {
        const isValid = await validateImageURL(blockData.url);
        if (!isValid) {
          throw wrapError(
            "AddBlock",
            `Invalid or inaccessible image URL: ${blockData.url}`,
          );
        }
      }

      // Process block using centralized logic
      try {
        blocks[blockId] = processBlock(blockType, blockData);
      } catch (error) {
        throw new Error(
          `Error processing block data: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      // Insert at specified position or at the end
      if (
        position !== undefined &&
        position >= 0 &&
        position <= blocks_layout.items.length
      ) {
        blocks_layout.items.splice(position, 0, blockId);
      } else {
        blocks_layout.items.push(blockId);
      }

      // Update the content
      const updatedContent = await client.patch(path, {
        blocks,
        blocks_layout,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(updatedContent, null, 2),
          },
        ],
      };
    } catch (error) {
      throw wrapError("AddBlock", error);
    }
  }

  public async handleUpdateBlock(args: any): Promise<CallToolResult> {
    try {
      const { path, blockId, blockData } = args;
      const client = this.requireClient();

      // First get the current content
      const content: PloneContent = await client.get(path);

      const blocks = content.blocks || {};

      if (!blocks[blockId]) {
        const availableBlockIds = Object.keys(blocks);
        throw new Error(
          `Block with ID '${blockId}' not found. Available block IDs: ${availableBlockIds.join(
            ", ",
          )}`,
        );
      }

      // Update the specific block
      blocks[blockId] = {
        ...blocks[blockId],
        ...blockData,
      };

      // Update the content
      const updatedContent = await client.patch(path, { blocks });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(updatedContent, null, 2),
          },
        ],
      };
    } catch (error) {
      throw wrapError("UpdateBlock", error);
    }
  }

  public async handleRemoveBlock(args: any): Promise<CallToolResult> {
    try {
      const { path, blockId } = args;
      const client = this.requireClient();

      // First get the current content
      const content: PloneContent = await client.get(path);

      const blocks = content.blocks || {};
      const blocks_layout = content.blocks_layout || { items: [] };

      if (!blocks[blockId]) {
        const availableBlockIds = Object.keys(blocks);
        throw new Error(
          `Block with ID '${blockId}' not found. Available block IDs: ${availableBlockIds.join(
            ", ",
          )}`,
        );
      }

      // Remove the block
      delete blocks[blockId];

      // Remove from layout
      const index = blocks_layout.items.indexOf(blockId);
      if (index > -1) {
        blocks_layout.items.splice(index, 1);
      }

      // Update the content
      const updatedContent = await client.patch(path, {
        blocks,
        blocks_layout,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(updatedContent, null, 2),
          },
        ],
      };
    } catch (error) {
      throw wrapError("RemoveBlock", error);
    }
  }

  public async handleGetNavigationTree(args: any): Promise<CallToolResult> {
    try {
      const { root_path, depth } = args;
      const client = this.requireClient();

      // Use root path if provided, otherwise use site root
      const pathToUse = root_path || "/";

      // Build query parameters for navigation
      const params: Record<string, any> = {};
      if (depth !== undefined) {
        params.depth = depth;
      }

      // Use the @navigation endpoint
      const navigation = await client.get(`${pathToUse}/@navigation`, params);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(navigation, null, 2),
          },
        ],
      };
    } catch (error) {
      throw wrapError("GetNavigationTree", error);
    }
  }
}

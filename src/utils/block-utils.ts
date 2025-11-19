import "isomorphic-fetch";
import { z } from "zod";
import { markdownParse } from "plone-mcp/markdown-parser";
import { v4 as uuidv4 } from "uuid";

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
  blockData: Record<string, unknown>,
): Record<string, unknown> {
  if (blockType === "slate" || blockType === "text") {
    // Convert text block to Slate format
    const textContent = (blockData.text as string) || "";
    return {
      "@type": "slate",
      plaintext: textContent,
      value: markdownParse(textContent),
      theme: (blockData.theme as string) || "default",
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
    const processedData: Record<string, unknown> = {
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
export function getBlockExample(blockType: string): unknown {
  const examples: Record<string, unknown> = {
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

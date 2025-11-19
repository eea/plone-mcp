import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { sessionManager } from "../../src/session-manager";
import ploneCreateBlocksLayout from "../../src/tools/plone_create_blocks_layout";
import * as BlockUtils from "../../src/utils/block-utils";
import { headers } from "xmcp/headers";

vi.mock("xmcp/headers", () => ({
  headers: vi.fn(),
}));

describe("plone_create_blocks_layout", () => {
  const sessionId = "test-session-id";

  beforeEach(() => {
    vi.mocked(headers).mockReturnValue({
      "mcp-session-id": sessionId,
    });
    const service = sessionManager.getSession(sessionId);
    service.clearPreparedBlocks();
    vi.restoreAllMocks(); // Restore all mocks for clean slate
    vi.spyOn(BlockUtils, "validateImageURL").mockResolvedValue(true); // Default to valid image URLs
    let idCounter = 0;
    vi.spyOn(BlockUtils, "generateBlockId").mockImplementation(
      () => `mock-id-${++idCounter}`,
    ); // Mock ID generation
  });

  afterEach(() => {
    const service = sessionManager.getSession(sessionId);
    service.clearPreparedBlocks();
    vi.restoreAllMocks();
  });

  it("should successfully prepare a layout with text blocks", async () => {
    const args = {
      blocks: [
        { type: "text", data: { text: "Hello World" } },
        { type: "text", data: { text: "Another paragraph" } },
      ],
    };

    const result = await ploneCreateBlocksLayout(args);
    const service = sessionManager.getSession(sessionId);
    const preparedBlocks = service.getPreparedBlocks();

    expect(result.content[0].text).toContain("Successfully prepared 2 blocks");
    expect(preparedBlocks).not.toBeNull();
    expect(Object.keys(preparedBlocks?.blocks || {}).length).toBe(2);
    expect(preparedBlocks?.blocks_layout.items.length).toBe(2);
    expect(preparedBlocks?.blocks["mock-id-1"]["@type"]).toBe("slate"); // 'text' type becomes 'slate'
    expect(preparedBlocks?.blocks["mock-id-1"].plaintext).toBe("Hello World");
    expect(preparedBlocks?.blocks["mock-id-2"]["@type"]).toBe("slate");
    expect(preparedBlocks?.blocks["mock-id-2"].plaintext).toBe(
      "Another paragraph",
    );
  });

  it("should successfully prepare a layout with a mix of block types", async () => {
    const args = {
      blocks: [
        { type: "text", data: { text: "Intro" } },
        {
          type: "teaser",
          data: { title: "My Teaser", href: "/some-path" },
        },
      ],
    };

    const result = await ploneCreateBlocksLayout(args);
    const service = sessionManager.getSession(sessionId);
    const preparedBlocks = service.getPreparedBlocks();

    expect(result.content[0].text).toContain("Successfully prepared 2 blocks");
    expect(preparedBlocks).not.toBeNull();
    expect(Object.keys(preparedBlocks?.blocks || {}).length).toBe(2);
    expect(preparedBlocks?.blocks_layout.items.length).toBe(2);
    expect(preparedBlocks?.blocks["mock-id-1"]["@type"]).toBe("slate");
    expect(preparedBlocks?.blocks["mock-id-1"].plaintext).toBe("Intro");
    expect(preparedBlocks?.blocks["mock-id-2"]["@type"]).toBe("teaser");
    expect(preparedBlocks?.blocks["mock-id-2"].title).toBe("My Teaser");
    expect(preparedBlocks?.blocks["mock-id-2"].href[0]["@id"]).toBe(
      "/some-path",
    );
  });

  it("should prepare a layout with an image block when URL is valid", async () => {
    vi.spyOn(BlockUtils, "validateImageURL").mockResolvedValue(true);
    const args = {
      blocks: [
        { type: "image", data: { url: "http://example.com/image.jpg" } },
      ],
    };

    await ploneCreateBlocksLayout(args);
    const service = sessionManager.getSession(sessionId);
    const preparedBlocks = service.getPreparedBlocks();

    expect(preparedBlocks).not.toBeNull();
    expect(preparedBlocks?.blocks["mock-id-1"]["@type"]).toBe("image");
    expect(preparedBlocks?.blocks["mock-id-1"].url).toBe(
      "http://example.com/image.jpg",
    );
    expect(BlockUtils.validateImageURL).toHaveBeenCalledWith(
      "http://example.com/image.jpg",
    );
  });

  it("should throw an error if an image block has an invalid URL and clear prepared blocks", async () => {
    vi.spyOn(BlockUtils, "validateImageURL").mockResolvedValue(false);
    const args = {
      blocks: [
        { type: "image", data: { url: "http://invalid.com/image.jpg" } },
      ],
    };

    await expect(ploneCreateBlocksLayout(args)).rejects.toThrow(
      "[CreateBlocksLayout] Invalid or inaccessible image URL: http://invalid.com/image.jpg",
    );
    expect(BlockUtils.validateImageURL).toHaveBeenCalledWith(
      "http://invalid.com/image.jpg",
    );
    const service = sessionManager.getSession(sessionId);
    expect(service.getPreparedBlocks()).toBeNull(); // Should be cleared on error
  });

  it("should prepare an empty layout if no blocks are provided", async () => {
    const args = { blocks: [] };
    const result = await ploneCreateBlocksLayout(args);
    const service = sessionManager.getSession(sessionId);
    const preparedBlocks = service.getPreparedBlocks();

    expect(result.content[0].text).toContain("Successfully prepared 0 blocks");
    expect(preparedBlocks).not.toBeNull();
    expect(Object.keys(preparedBlocks?.blocks || {}).length).toBe(0);
    expect(preparedBlocks?.blocks_layout.items.length).toBe(0);
  });

  it("should clear prepared blocks if there is a block data processing error", async () => {
    vi.spyOn(BlockUtils, "processBlock").mockImplementation(() => {
      throw new Error("Mock processing error");
    });

    const args = {
      blocks: [{ type: "text", data: { text: "This will fail" } }],
    };

    await expect(ploneCreateBlocksLayout(args)).rejects.toThrow(
      "[CreateBlocksLayout] Mock processing error",
    );
    const service = sessionManager.getSession(sessionId);
    expect(service.getPreparedBlocks()).toBeNull();
  });
});

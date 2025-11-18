import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import nock from "nock";
import { PloneMockServer, sampleDocument } from "../utils/test-helpers";
import ploneAddSingleBlock from "../../src/tools/plone_add_single_block";
import { ploneHandlersSingleton } from "../../src/plone-singleton";
import { PloneClient } from "../../src/plone-client";
import * as BlockUtils from "../../src/utils/block-utils"; // Import all from block-utils

describe("plone_add_single_block", () => {
  let mockServer: PloneMockServer;
  const testBaseUrl = "http://localhost:8080/Plone";
  const testPath = "/my-page";
  const mockContent = {
    ...sampleDocument,
    "@id": `${testBaseUrl}/++api++${testPath}`,
    id: "my-page",
    blocks: {
      "block-existing-1": { "@type": "text", plaintext: "Existing block 1" },
      "block-existing-2": { "@type": "text", plaintext: "Existing block 2" },
    },
    blocks_layout: {
      items: ["block-existing-1", "block-existing-2"],
    },
  };
  const defaultReqHeaders = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  beforeEach(() => {
    mockServer = new PloneMockServer(testBaseUrl);
    ploneHandlersSingleton.client = new PloneClient({ baseUrl: testBaseUrl });
    // Mock the validateImageURL function
    vi.spyOn(BlockUtils, "validateImageURL").mockResolvedValue(true);
    // Mock generateBlockId to return unique IDs
    vi.spyOn(BlockUtils, "generateBlockId").mockImplementation((
      (i = 0) => () =>
        `mock-id-${++i}`
    )());
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks(); // Restore all mocks after each test
  });

  it("should successfully add a text block to an existing content item", async () => {
    // Mock getting the existing content
    mockServer.mockContentGet(testPath).reply(200, mockContent);

    // Mock the patch request for updating content
    const mockContentAfterAdd = { ...mockContent, message: "Block added" };
    mockServer.mockContentUpdate(
      testPath,
      (body: any) => {
        // Assert that the new block is in the body
        const newBlockId = body.blocks_layout.items.find(
          (id: string) => !mockContent.blocks[id],
        );
        expect(newBlockId).toBeDefined();
        expect(body.blocks[newBlockId]["@type"]).toBe("slate"); // processBlock converts "text" to "slate"
        expect(body.blocks[newBlockId].plaintext).toBe("New paragraph");
        expect(body.blocks_layout.items).toContain(newBlockId);
        return true;
      },
      mockContentAfterAdd,
    );

    const args = {
      path: testPath,
      blockType: "text",
      blockData: { text: "New paragraph" },
    };

    const result = await ploneAddSingleBlock(args);

    expect(result.content[0].text).toEqual(JSON.stringify(mockContentAfterAdd, null, 2));
    expect(nock.isDone()).toBe(true);
  });

  it("should successfully add an image block with a valid URL", async () => {
    // Ensure validateImageURL is mocked to return true for this test
    vi.spyOn(BlockUtils, "validateImageURL").mockResolvedValue(true);

    mockServer.mockContentGet(testPath).reply(200, mockContent);
    const mockContentAfterImageAdd = {
      ...mockContent,
      message: "Image block added",
    };
    mockServer.mockContentUpdate(
      testPath,
      (body: any) => {
        const newBlockId = body.blocks_layout.items.find(
          (id: string) => !mockContent.blocks[id],
        );
        expect(newBlockId).toBeDefined();
        expect(body.blocks[newBlockId]["@type"]).toBe("image");
        expect(body.blocks[newBlockId].url).toBe("http://example.com/image.jpg");
        return true;
      },
      mockContentAfterImageAdd,
    );

    const args = {
      path: testPath,
      blockType: "image",
      blockData: { url: "http://example.com/image.jpg", alt: "My Image" },
    };

    const result = await ploneAddSingleBlock(args);

    expect(result.content[0].text).toEqual(JSON.stringify(mockContentAfterImageAdd, null, 2));
    expect(BlockUtils.validateImageURL).toHaveBeenCalledWith(
      "http://example.com/image.jpg",
    );
    expect(nock.isDone()).toBe(true);
  });

  it("should throw an error if an image block is added with an invalid URL", async () => {
    vi.spyOn(BlockUtils, "validateImageURL").mockResolvedValue(false); // Simulate invalid URL

    mockServer.mockContentGet(testPath).reply(200, mockContent);
    // No mock for patch, as it should not be called

    const args = {
      path: testPath,
      blockType: "image",
      blockData: { url: "http://invalid.com/image.jpg", alt: "Invalid Image" },
    };

    await expect(ploneAddSingleBlock(args)).rejects.toThrow(
      "[AddBlock] Invalid or inaccessible image URL: http://invalid.com/image.jpg",
    );
    expect(BlockUtils.validateImageURL).toHaveBeenCalledWith(
      "http://invalid.com/image.jpg",
    );
    expect(nock.pendingMocks()).toHaveLength(0); // No patch request should have been made
  });

  it("should add a block at a specific position", async () => {
    mockServer.mockContentGet(testPath).reply(200, mockContent);

    const mockContentAfterPositionAdd = {
      ...mockContent,
      message: "Block inserted at position 1",
    };
    mockServer.mockContentUpdate(
      testPath,
      (body: any) => {
        const newBlockId = body.blocks_layout.items[1]; // Should be at index 1
        expect(body.blocks[newBlockId]["@type"]).toBe("slate");
        expect(body.blocks[newBlockId].plaintext).toBe("Inserted paragraph");
        expect(body.blocks_layout.items[0]).toBe("block-existing-1");
        expect(body.blocks_layout.items[1]).toBe(newBlockId);
        expect(body.blocks_layout.items[2]).toBe("block-existing-2");
        return true;
      },
      mockContentAfterPositionAdd,
    );

    const args = {
      path: testPath,
      blockType: "text",
      blockData: { text: "Inserted paragraph" },
      position: 1,
    };

    const result = await ploneAddSingleBlock(args);
    expect(result.content[0].text).toEqual(JSON.stringify(mockContentAfterPositionAdd, null, 2));
    expect(nock.isDone()).toBe(true);
  });

  it("should throw an error if Plone client is not configured", async () => {
    ploneHandlersSingleton.client = null; // Ensure client is not configured

    const args = {
      path: testPath,
      blockType: "text",
      blockData: { text: "Some text" },
    };

    await expect(ploneAddSingleBlock(args)).rejects.toThrow(
      "Plone client not configured. Please run plone_configure first.",
    );
    expect(nock.pendingMocks()).toHaveLength(0); // No API calls should be made
  });

  it("should throw an error if getting content fails", async () => {
    nock(testBaseUrl, { reqheaders: defaultReqHeaders })
      .get(`/++api++${testPath}`)
      .reply(404, "Not Found");

    const args = {
      path: testPath,
      blockType: "text",
      blockData: { text: "Some text" },
    };

    await expect(ploneAddSingleBlock(args)).rejects.toThrow(
      `[AddBlock] Request failed with status code 404`,
    );
    expect(nock.isDone()).toBe(true);
  });

  it("should throw an error if patching content fails", async () => {
    mockServer.mockContentGet(testPath).reply(200, mockContent);
    nock(testBaseUrl, { reqheaders: defaultReqHeaders })
      .patch(`/++api++${testPath}`)
      .reply(500, "Server Error");

    const args = {
      path: testPath,
      blockType: "text",
      blockData: { text: "Some text" },
    };

    await expect(ploneAddSingleBlock(args)).rejects.toThrow(
      `[AddBlock] Request failed with status code 500`,
    );
    expect(nock.isDone()).toBe(true);
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Nock } from "../utils/test-helpers";
import { PloneMockServer, sampleDocument } from "../utils/test-helpers";
import ploneUpdateSingleBlock from "../../src/tools/plone_update_single_block";
import { ploneHandlersSingleton } from "../../src/plone-singleton";
import { PloneClient } from "../../src/plone-client";

describe("plone_update_single_block", () => {
  let mockServer: PloneMockServer;
  const testBaseUrl = "http://localhost:8080/Plone";
  const testPath = "/my-page";
  const blockToUpdateId = "block-to-update";
  const existingBlockData = {
    "@type": "text",
    plaintext: "Original text",
    value: [],
  };

  const mockContentWithBlock = {
    ...sampleDocument,
    "@id": `${testBaseUrl}/++api++${testPath}`,
    id: "my-page",
    blocks: {
      [blockToUpdateId]: existingBlockData,
    },
    blocks_layout: {
      items: [blockToUpdateId],
    },
  };

  const updatedBlockData = { plaintext: "Updated text" };
  const mockContentAfterUpdate = {
    ...mockContentWithBlock,
    blocks: {
      [blockToUpdateId]: { ...existingBlockData, ...updatedBlockData },
    },
  };

  const defaultReqHeaders = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  beforeEach(() => {
    mockServer = new PloneMockServer(testBaseUrl);
    ploneHandlersSingleton.client = new PloneClient({ baseUrl: testBaseUrl });
  });

  afterEach(() => {
    Nock.cleanAll();
  });

  it("should successfully update an existing block", async () => {
    mockServer.mockContentGet(testPath, mockContentWithBlock);
    mockServer.mockContentUpdate(
      testPath,
      (body: any) => {
        expect(body.blocks[blockToUpdateId].plaintext).toBe(updatedBlockData.plaintext);
        return true;
      },
      mockContentAfterUpdate,
    );

    const args = {
      path: testPath,
      blockId: blockToUpdateId,
      blockData: updatedBlockData,
    };
    const result = await ploneUpdateSingleBlock(args);

    expect(JSON.parse(result.content[0].text)).toEqual(mockContentAfterUpdate);
    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if attempting to update a non-existent block", async () => {
    mockServer.mockContentGet(testPath, mockContentWithBlock);
    // No mock for patch, as it should not be called

    const nonExistentBlockId = "non-existent-block";
    const args = {
      path: testPath,
      blockId: nonExistentBlockId,
      blockData: updatedBlockData,
    };

    await expect(ploneUpdateSingleBlock(args)).rejects.toThrow(
      `Block with ID '${nonExistentBlockId}' not found. Available block IDs: ${blockToUpdateId}`,
    );
    expect(Nock.pendingMocks()).toHaveLength(0); // No patch request should have been made
  });

  it("should throw an error if content retrieval fails", async () => {
    Nock.default(testBaseUrl, { reqheaders: defaultReqHeaders })
      .get(`/++api++${testPath}`)
      .reply(404, "Not Found");

    const args = {
      path: testPath,
      blockId: blockToUpdateId,
      blockData: updatedBlockData,
    };
    await expect(ploneUpdateSingleBlock(args)).rejects.toThrow(
      `[UpdateBlock] Request failed with status code 404`,
    );
    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if content update fails", async () => {
    mockServer.mockContentGet(testPath, mockContentWithBlock);
    Nock.default(testBaseUrl, { reqheaders: defaultReqHeaders })
      .patch(`/++api++${testPath}`)
      .reply(500, "Server Error");

    const args = {
      path: testPath,
      blockId: blockToUpdateId,
      blockData: updatedBlockData,
    };
    await expect(ploneUpdateSingleBlock(args)).rejects.toThrow(
      `[UpdateBlock] Request failed with status code 500`,
    );
    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if Plone client is not configured", async () => {
    ploneHandlersSingleton.client = null;

    const args = {
      path: testPath,
      blockId: blockToUpdateId,
      blockData: updatedBlockData,
    };
    await expect(ploneUpdateSingleBlock(args)).rejects.toThrow(
      "Plone client not configured. Please run plone_configure first.",
    );
    expect(Nock.pendingMocks()).toHaveLength(0); // No API call should be made
  });
});

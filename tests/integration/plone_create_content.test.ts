import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { Nock } from "../utils/test-helpers";
import { PloneMockServer, sampleDocument } from "../utils/test-helpers";
import ploneCreateContent from "../../src/tools/plone_create_content";
import { sessionManager } from "../../src/session-manager";
import { PloneClient, PloneContent } from "../../src/plone-client";
import * as BlockUtils from "../../src/utils/block-utils";
import { PreparedBlocks } from "../../src/plone-service";
import { headers } from "xmcp/headers";
import { type InferSchema } from "xmcp";
import { schema } from "../../src/tools/plone_create_content";

vi.mock("xmcp/headers", () => ({
  headers: vi.fn(),
}));

describe("plone_create_content", () => {
  let mockServer: PloneMockServer;
  const testBaseUrl = "http://localhost:8080/Plone";
  const parentPath = "/";
  const newContentId = "my-new-page";
  const newContentPath = `${parentPath}${newContentId}`;
  const sessionId = "test-session-id";

  const mockCreatedContent = {
    ...sampleDocument,
    "@id": `${testBaseUrl}/++api++${newContentPath}`,
    id: newContentId,
    title: "My New Page",
  };

  beforeEach(() => {
    mockServer = new PloneMockServer(testBaseUrl);

    // Mock headers to return the test session ID
    vi.mocked(headers).mockReturnValue({
      get: vi.fn((name: string) => (name === "mcp-session-id" ? sessionId : undefined)),
    });
    const service = sessionManager.getSession(sessionId);
    service.client = new PloneClient({ baseUrl: testBaseUrl });
    service.clearPreparedBlocks(); // Ensure no prepared blocks initially

    vi.spyOn(BlockUtils, "generateBlockId").mockImplementation(
      (
        (i = 0) =>
        () =>
          `mock-id-${++i}`
      )(),
    ); // Make generateBlockId return unique IDs
  });

  afterEach(() => {
    Nock.cleanAll();
    vi.restoreAllMocks();
    const service = sessionManager.getSession(sessionId);
    service.clearPreparedBlocks();
  });

  it("should successfully create simple content", async () => {
    mockServer.mockContentCreate(
      parentPath,
      (body: PloneContent) => {
        expect(body["@type"]).toBe("Document");
        expect(body.title).toBe("My New Page");
        expect(body.description).toBe("A description");
        const titleBlockId = body.blocks_layout!.items[0];
        expect(body.blocks![titleBlockId]).toEqual({ "@type": "title" });
        return true;
      },
      mockCreatedContent,
    );

    const args: InferSchema<typeof schema> = {
      parentPath: parentPath,
      type: "Document",
      title: "My New Page",
      description: "A description",
      id: undefined, // Explicitly undefined
      blocks: undefined, // Explicitly undefined
      blocks_layout: undefined, // Explicitly undefined
      additionalFields: undefined, // Explicitly undefined
    };

    const result = await ploneCreateContent(args);

    expect(JSON.parse(result.content[0].text)).toEqual(mockCreatedContent);
    expect(Nock.isDone()).toBe(true);
  });

  it("should create content with a specified ID", async () => {
    mockServer.mockContentCreate(
      parentPath,
      (body: PloneContent) => {
        expect(body["@type"]).toBe("Document");
        expect(body.title).toBe("My New Page");
        expect(body.id).toBe("custom-id");
        const titleBlockId = body.blocks_layout!.items[0];
        expect(body.blocks![titleBlockId]).toEqual({ "@type": "title" });
        return true;
      },
      { ...mockCreatedContent, id: "custom-id" },
    );

    const args: InferSchema<typeof schema> = {
      parentPath: parentPath,
      type: "Document",
      title: "My New Page",
      id: "custom-id",
      description: undefined, // Explicitly undefined
      blocks: undefined, // Explicitly undefined
      blocks_layout: undefined, // Explicitly undefined
      additionalFields: undefined, // Explicitly undefined
    };

    await ploneCreateContent(args);
    expect(Nock.isDone()).toBe(true);
  });

  it("should create content with prepared blocks and clear them after", async () => {
    // Generate unique IDs for prepared blocks, separate from the title block
    const preparedBlockId = BlockUtils.generateBlockId();
    const preparedBlocksData: PreparedBlocks = {
      blocks: {
        [preparedBlockId]: { "@type": "slate", plaintext: "Prepared text" },
      },
      blocks_layout: { items: [preparedBlockId] },
      timestamp: Date.now(),
    };

    const service = sessionManager.getSession(sessionId);
    service.setPreparedBlocks(preparedBlocksData);

    mockServer.mockContentCreate(
      parentPath,
      (body: PloneContent) => {
        const titleBlockId = body.blocks_layout!.items[0];
        expect(body.blocks!).toEqual({
          [titleBlockId]: { "@type": "title" },
          [preparedBlockId]: { "@type": "slate", plaintext: "Prepared text" },
        });
        expect(body.blocks_layout!.items).toEqual([
          titleBlockId,
          preparedBlockId,
        ]);
        return true;
      },
      mockCreatedContent,
    );

    const args: InferSchema<typeof schema> = {
      parentPath: parentPath,
      type: "Document",
      title: "Page with Prepared Blocks",
      description: undefined, // Explicitly undefined
      id: undefined, // Explicitly undefined
      blocks: undefined, // Explicitly undefined
      blocks_layout: undefined, // Explicitly undefined
      additionalFields: undefined, // Explicitly undefined
    };

    await ploneCreateContent(args);

    expect(service.getPreparedBlocks()).toBeNull(); // Should be cleared
    expect(Nock.isDone()).toBe(true);
  });

  it("should prioritize inline blocks over prepared blocks", async () => {
    const preparedBlockId = BlockUtils.generateBlockId();
    const preparedBlocksData: PreparedBlocks = {
      blocks: {
        [preparedBlockId]: { "@type": "slate", plaintext: "Prepared text" },
      },
      blocks_layout: { items: [preparedBlockId] },
      timestamp: Date.now(),
    };

    const service = sessionManager.getSession(sessionId);
    service.setPreparedBlocks(preparedBlocksData);

    const inlineBlockId = BlockUtils.generateBlockId();
    const inlineBlocks = {
      [inlineBlockId]: { "@type": "slate", plaintext: "Inline text" },
    };
    const inlineLayout = { items: [inlineBlockId] };

    mockServer.mockContentCreate(
      parentPath,
      (body: PloneContent) => {
        const titleBlockId = body.blocks_layout!.items[0];
        expect(body.blocks!).toEqual({
          [titleBlockId]: { "@type": "title" },
          ...inlineBlocks,
        });
        expect(body.blocks_layout!.items).toEqual([
          titleBlockId,
          ...inlineLayout.items,
        ]);
        return true;
      },
      mockCreatedContent,
    );

    const args: InferSchema<typeof schema> = {
      parentPath: parentPath,
      type: "Document",
      title: "Page with Inline Blocks",
      blocks: inlineBlocks,
      blocks_layout: inlineLayout,
      description: undefined, // Explicitly undefined
      id: undefined, // Explicitly undefined
      additionalFields: undefined, // Explicitly undefined
    };

    await ploneCreateContent(args);

    expect(service.getPreparedBlocks()).toBeNull(); // Still cleared
    expect(Nock.isDone()).toBe(true);
  });

  it("should create content with additional fields", async () => {
    const additionalFields = {
      effective: "2025-01-01T12:00:00Z",
      creators: ["author1"],
    };

    mockServer.mockContentCreate(
      parentPath,
      (body: PloneContent) => {
        expect(body["@type"]).toBe("Document");
        expect(body.title).toBe("Page with Extra Fields");
        expect(body.effective).toBe(additionalFields.effective);
        expect(body.creators).toEqual(additionalFields.creators);
        const titleBlockId = body.blocks_layout!.items[0];
        expect(body.blocks![titleBlockId]).toEqual({ "@type": "title" });
        return true;
      },
      mockCreatedContent,
    );

    const args: InferSchema<typeof schema> = {
      parentPath: parentPath,
      type: "Document",
      title: "Page with Extra Fields",
      additionalFields: additionalFields,
      description: undefined, // Explicitly undefined
      id: undefined, // Explicitly undefined
      blocks: undefined, // Explicitly undefined
      blocks_layout: undefined, // Explicitly undefined
    };

    await ploneCreateContent(args);
    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if content creation fails and clear prepared blocks", async () => {
    const preparedBlockId = BlockUtils.generateBlockId();
    const preparedBlocksData: PreparedBlocks = {
      blocks: {
        [preparedBlockId]: { "@type": "slate", plaintext: "Prepared text" },
      },
      blocks_layout: { items: [preparedBlockId] },
      timestamp: Date.now(),
    };

    const service = sessionManager.getSession(sessionId);
    service.setPreparedBlocks(preparedBlocksData);

    mockServer.mockContentCreate(
      parentPath,
      (body: PloneContent) => {
        const titleBlockId = body.blocks_layout!.items[0];
        expect(body.blocks!).toEqual({
          [titleBlockId]: { "@type": "title" },
          [preparedBlockId]: { "@type": "slate", plaintext: "Prepared text" },
        });
        expect(body.blocks_layout!.items).toEqual([
          titleBlockId,
          preparedBlockId,
        ]);
        return true;
      },
      500,
      "Server Error" as string,
    );

    const args: InferSchema<typeof schema> = {
      parentPath: parentPath,
      type: "Document",
      title: "Failing Page",
      description: undefined, // Explicitly undefined
      id: undefined, // Explicitly undefined
      blocks: undefined, // Explicitly undefined
      blocks_layout: undefined, // Explicitly undefined
      additionalFields: undefined, // Explicitly undefined
    };

    await expect(ploneCreateContent(args)).rejects.toThrow(
      "[CreateContent] Request failed with status code 500",
    );
    expect(service.getPreparedBlocks()).toBeNull(); // Should be cleared
    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if Plone client is not configured", async () => {
    const service = sessionManager.getSession(sessionId);
    service.client = null;

    const args: InferSchema<typeof schema> = {
      parentPath: parentPath,
      type: "Document",
      title: "My New Page",
      description: undefined, // Explicitly undefined
      id: undefined, // Explicitly undefined
      blocks: undefined, // Explicitly undefined
      blocks_layout: undefined, // Explicitly undefined
      additionalFields: undefined, // Explicitly undefined
    };

    await expect(ploneCreateContent(args)).rejects.toThrow(
      "Plone client not configured. Please run plone_configure first.",
    );
    expect(Nock.pendingMocks()).toHaveLength(0); // No API call should be made
  });
});


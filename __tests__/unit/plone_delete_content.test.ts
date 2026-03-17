import { describe, it, expect, vi, beforeEach } from "vitest";
import ploneDeleteContent, {
  schema,
  metadata,
} from "plone-mcp/tools/plone_delete_content";
import { sessionManager } from "plone-mcp/session-manager";
import { headers } from "xmcp/headers";
import { getSessionId } from "plone-mcp/utils/session";
import { wrapError } from "plone-mcp/utils/block-utils";
import { PloneMockServer } from "plone-mcp/__tests__/utils/test-helpers";

// Mock dependencies
vi.mock("xmcp/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("plone-mcp/session-manager", () => ({
  sessionManager: {
    getSession: vi.fn(),
  },
}));

vi.mock("plone-mcp/utils/session", () => ({
  getSessionId: vi.fn(),
}));

vi.mock("plone-mcp/utils/block-utils", () => ({
  wrapError: vi.fn(),
}));

describe("plone_delete_content", () => {
  let mockServer: PloneMockServer;
  let mockClient: any;
  let mockService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = new PloneMockServer();

    mockClient = {
      delete: vi.fn(),
    };

    mockService = {
      getClient: vi.fn().mockReturnValue(mockClient),
    };

    (sessionManager.getSession as any).mockReturnValue(mockService);
    (headers as any).mockReturnValue({});
    (getSessionId as any).mockReturnValue("test-session-id");
  });

  describe("schema", () => {
    it("should have correct path schema", () => {
      expect(schema.path).toBeDefined();
      expect(schema.path.description).toBe("Path to the content to delete");
    });
  });

  describe("metadata", () => {
    it("should have correct metadata", () => {
      expect(metadata.name).toBe("plone_delete_content");
      expect(metadata.description).toContain(
        "Permanently deletes a content item",
      );
      expect(metadata.annotations?.destructiveHint).toBe(true);
      expect(metadata.annotations?.idempotentHint).toBe(true);
      expect(metadata.annotations?.readOnlyHint).toBe(false);
    });
  });

  describe("functionality", () => {
    it("should delete content successfully", async () => {
      const testPath = "/test-document";
      mockServer.mockContentDelete(testPath, 204);

      const result = await ploneDeleteContent({ path: testPath });

      expect(mockClient.delete).toHaveBeenCalledWith(testPath);
      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: `Successfully deleted content at path: ${testPath} `,
          },
        ],
      });
    });

    it("should handle root path deletion", async () => {
      const testPath = "/";
      mockServer.mockContentDelete(testPath, 204);

      const result = await ploneDeleteContent({ path: testPath });

      expect(mockClient.delete).toHaveBeenCalledWith(testPath);
      expect(result.content[0].text).toContain(
        "Successfully deleted content at path: /",
      );
    });

    it("should handle nested path deletion", async () => {
      const testPath = "/folder/subfolder/document";
      mockServer.mockContentDelete(testPath, 204);

      const result = await ploneDeleteContent({ path: testPath });

      expect(mockClient.delete).toHaveBeenCalledWith(testPath);
      expect(result.content[0].text).toContain(testPath);
    });

    it("should use correct session management", async () => {
      const testPath = "/test-doc";
      mockServer.mockContentDelete(testPath, 204);

      await ploneDeleteContent({ path: testPath });

      expect(headers).toHaveBeenCalled();
      expect(getSessionId).toHaveBeenCalled();
      expect(sessionManager.getSession).toHaveBeenCalledWith("test-session-id");
      expect(mockService.getClient).toHaveBeenCalled();
    });

    it("should handle API errors with wrapError", async () => {
      const testPath = "/non-existent";
      const apiError = new Error("Content not found");
      mockClient.delete.mockRejectedValue(apiError);

      const wrappedError = new Error("DeleteContent: Content not found");
      (wrapError as any).mockReturnValue(wrappedError);

      await expect(ploneDeleteContent({ path: testPath })).rejects.toThrow(
        wrappedError,
      );

      expect(wrapError).toHaveBeenCalledWith("DeleteContent", apiError);
    });

    it("should handle network errors", async () => {
      const testPath = "/test-doc";
      const networkError = new Error("Network timeout");
      mockClient.delete.mockRejectedValue(networkError);

      const wrappedError = new Error("DeleteContent: Network timeout");
      (wrapError as any).mockReturnValue(wrappedError);

      await expect(ploneDeleteContent({ path: testPath })).rejects.toThrow(
        wrappedError,
      );

      expect(wrapError).toHaveBeenCalledWith("DeleteContent", networkError);
    });

    it("should handle empty path gracefully", async () => {
      const testPath = "";
      mockServer.mockContentDelete(testPath, 204);

      const result = await ploneDeleteContent({ path: testPath });

      expect(mockClient.delete).toHaveBeenCalledWith(testPath);
      expect(result.content[0].text).toContain(
        "Successfully deleted content at path: ",
      );
    });

    it("should handle special characters in path", async () => {
      const testPath = "/folder with spaces/document-with-dashes_123";
      mockServer.mockContentDelete(testPath, 204);

      const result = await ploneDeleteContent({ path: testPath });

      expect(mockClient.delete).toHaveBeenCalledWith(testPath);
      expect(result.content[0].text).toContain(testPath);
    });
  });

  describe("return value structure", () => {
    it("should return correct structure", async () => {
      const testPath = "/test";
      mockServer.mockContentDelete(testPath, 204);

      const result = await ploneDeleteContent({ path: testPath });

      expect(result).toHaveProperty("content");
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty("type", "text");
      expect(result.content[0]).toHaveProperty("text");
      expect(typeof result.content[0].text).toBe("string");
    });
  });
});

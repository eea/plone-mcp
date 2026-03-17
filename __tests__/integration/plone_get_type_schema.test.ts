import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { headers } from "xmcp/headers";
import { Nock, PloneMockServer } from "plone-mcp/__tests__/utils/test-helpers";
import ploneGetTypeSchema, { schema } from "plone-mcp/tools/plone_get_type_schema";
import { sessionManager } from "plone-mcp/session-manager";
import { PloneClient } from "plone-mcp/plone-client";
import type { InferSchema } from "xmcp";

vi.mock("xmcp/headers", () => ({
  headers: vi.fn(),
}));

describe("plone_get_type_schema", () => {
  let mockServer: PloneMockServer;
  const testBaseUrl = "http://localhost:8080/Plone";
  const sessionId = "test-session-id";

  beforeEach(() => {
    vi.mocked(headers).mockReturnValue({
      "mcp-session-id": sessionId,
    });
    mockServer = new PloneMockServer(testBaseUrl);
    const service = sessionManager.getSession(sessionId);
    service.client = new PloneClient({ baseUrl: testBaseUrl });
  });

  afterEach(() => {
    Nock.cleanAll();
    vi.restoreAllMocks();
  });

  it("should successfully retrieve content type schema", async () => {
    const contentType = "Document";
    const typeSchema = {
      title: "Document",
      properties: {
        title: { title: "Title", type: "string" },
      },
    };

    Nock(testBaseUrl)
      .get(`/++api++/@types/${contentType}`)
      .reply(200, typeSchema);

    const args: InferSchema<typeof schema> = {
      contentType,
    };
    const result = await ploneGetTypeSchema(args);

    expect(JSON.parse(result.content[0].text)).toEqual(typeSchema);
    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if content type schema retrieval fails", async () => {
    const contentType = "UnknownType";

    Nock(testBaseUrl)
      .get(`/++api++/@types/${contentType}`)
      .reply(404, { message: "Type not found" });

    const args: InferSchema<typeof schema> = {
      contentType,
    };
    await expect(ploneGetTypeSchema(args)).rejects.toThrow(
      "[GetTypeSchema] Request failed with status code 404",
    );
    expect(Nock.isDone()).toBe(true);
  });
});

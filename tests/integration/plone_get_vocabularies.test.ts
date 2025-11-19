import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Nock } from "../utils/test-helpers";
import { PloneMockServer } from "../utils/test-helpers";
import ploneGetVocabularies from "../../src/tools/plone_get_vocabularies";
import { PloneClient } from "../../src/plone-client";
import { sessionManager } from "../../src/session-manager";
import { headers } from "xmcp/headers";
import { type InferSchema } from "xmcp";
import { schema } from "../../src/tools/plone_get_vocabularies";

describe("plone_get_vocabularies", () => {
  let mockServer: PloneMockServer;
  const testBaseUrl = "http://localhost:8080/Plone";
  const testVocabulary = "plone.app.vocabularies.Keywords";
  const mockVocabularyResponse = {
    "@id": `${testBaseUrl}/++api++/@vocabularies/${testVocabulary}`,
    items: [
      { title: "Keyword 1", token: "keyword1" },
      { title: "Keyword 2", token: "keyword2" },
    ],
  };

  const sessionId = "test-session-id";

  beforeEach(() => {
    mockServer = new PloneMockServer(testBaseUrl);
    vi.mocked(headers).mockReturnValue({
      "mcp-session-id": sessionId,
    });
    const service = sessionManager.getSession(sessionId);
    service.client = new PloneClient({ baseUrl: testBaseUrl });
  });

  afterEach(() => {
    Nock.cleanAll();
    sessionManager.clearSession(sessionId);
  });

  it("should successfully retrieve vocabulary values", async () => {
    mockServer.mockVocabularies(testVocabulary, mockVocabularyResponse);

    const args: InferSchema<typeof schema> = { vocabulary: testVocabulary, title: undefined, token: undefined };
    const result = await ploneGetVocabularies(args);

    expect(JSON.parse(result.content[0].text)).toEqual(mockVocabularyResponse);
    expect(Nock.isDone()).toBe(true);
  });

  it("should retrieve vocabulary values with title filter", async () => {
    const titleFilter = "Keyword 1";
    Nock(testBaseUrl)
      .get(`/++api++/@vocabularies/${testVocabulary}`)
      .query({ title: titleFilter })
      .reply(200, mockVocabularyResponse);

    const args: InferSchema<typeof schema> = { vocabulary: testVocabulary, title: titleFilter, token: undefined };
    await ploneGetVocabularies(args);

    expect(Nock.isDone()).toBe(true);
  });

  it("should retrieve vocabulary values with token filter", async () => {
    const tokenFilter = "keyword2";
    Nock(testBaseUrl)
      .get(`/++api++/@vocabularies/${testVocabulary}`)
      .query({ token: tokenFilter })
      .reply(200, mockVocabularyResponse);

    const args: InferSchema<typeof schema> = { vocabulary: testVocabulary, token: tokenFilter, title: undefined };
    await ploneGetVocabularies(args);

    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if vocabulary retrieval fails", async () => {
    const nonExistentVocabulary = "non.existent.vocabulary";
    Nock(testBaseUrl)
      .get(`/++api++/@vocabularies/${nonExistentVocabulary}`)
      .reply(404, "Not Found");

    const args: InferSchema<typeof schema> = { vocabulary: nonExistentVocabulary, title: undefined, token: undefined };
    await expect(ploneGetVocabularies(args)).rejects.toThrow(
      "[GetVocabularies] Request failed with status code 404",
    );
    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if Plone client is not configured", async () => {
    const service = sessionManager.getSession(sessionId);
    service.client = null;

    const args: InferSchema<typeof schema> = { vocabulary: testVocabulary, title: undefined, token: undefined };
    await expect(ploneGetVocabularies(args)).rejects.toThrow(
      "Plone client not configured. Please run plone_configure first.",
    );
    expect(Nock.pendingMocks()).toHaveLength(0); // No API call should be made
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import nock from "nock";
import { PloneMockServer } from "../utils/test-helpers";
import ploneGetVocabularies from "../../src/tools/plone_get_vocabularies";
import { ploneHandlersSingleton } from "../../src/plone-singleton";
import { PloneClient } from "../../src/plone-client";

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

  beforeEach(() => {
    mockServer = new PloneMockServer(testBaseUrl);
    ploneHandlersSingleton.client = new PloneClient({ baseUrl: testBaseUrl });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it("should successfully retrieve vocabulary values", async () => {
    mockServer.mockVocabularies(testVocabulary).reply(200, mockVocabularyResponse);

    const args = { vocabulary: testVocabulary };
    const result = await ploneGetVocabularies(args);

    expect(JSON.parse(result.content[0].text)).toEqual(mockVocabularyResponse);
    expect(nock.isDone()).toBe(true);
  });

  it("should retrieve vocabulary values with title filter", async () => {
    const titleFilter = "Keyword 1";
    mockServer
      .mockVocabularies(testVocabulary)
      .query({ title: titleFilter })
      .reply(200, mockVocabularyResponse);

    const args = { vocabulary: testVocabulary, title: titleFilter };
    await ploneGetVocabularies(args);

    expect(nock.isDone()).toBe(true);
  });

  it("should retrieve vocabulary values with token filter", async () => {
    const tokenFilter = "keyword2";
    mockServer
      .mockVocabularies(testVocabulary)
      .query({ token: tokenFilter })
      .reply(200, mockVocabularyResponse);

    const args = { vocabulary: testVocabulary, token: tokenFilter };
    await ploneGetVocabularies(args);

    expect(nock.isDone()).toBe(true);
  });

  it("should throw an error if vocabulary retrieval fails", async () => {
    const nonExistentVocabulary = "non.existent.vocabulary";
    nock(testBaseUrl)
      .get(`/++api++/@vocabularies/${nonExistentVocabulary}`)
      .reply(404, "Not Found");

    const args = { vocabulary: nonExistentVocabulary };
    await expect(ploneGetVocabularies(args)).rejects.toThrow(
      "[GetVocabularies] Request failed with status code 404",
    );
    expect(nock.isDone()).toBe(true);
  });

  it("should throw an error if Plone client is not configured", async () => {
    ploneHandlersSingleton.client = null;

    const args = { vocabulary: testVocabulary };
    await expect(ploneGetVocabularies(args)).rejects.toThrow(
      "Plone client not configured. Please run plone_configure first.",
    );
    expect(nock.pendingMocks()).toHaveLength(0); // No API call should be made
  });
});

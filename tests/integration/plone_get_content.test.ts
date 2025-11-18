import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Nock } from "../utils/test-helpers";
import { PloneMockServer, sampleDocument } from "../utils/test-helpers";
import ploneGetContent from "../../src/tools/plone_get_content";
import { ploneHandlersSingleton } from "../../src/plone-singleton";
import { PloneClient } from "../../src/plone-client";

describe("plone_get_content", () => {
  let mockServer: PloneMockServer;
  const testBaseUrl = "http://localhost:8080/Plone";
  const testPath = "/test-document";
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

  it("should successfully retrieve content", async () => {
    mockServer.mockContentGet(testPath, sampleDocument);

    const args = { path: testPath };
    const result = await ploneGetContent(args);

    expect(JSON.parse(result.content[0].text)).toEqual(sampleDocument);
    expect(Nock.isDone()).toBe(true);
  });

  it("should retrieve content with expand parameters", async () => {
    const expandParams = ["breadcrumbs", "workflow"];
    Nock.default(testBaseUrl)
      .get(`/++api++${testPath}`)
      .query({
        expand: expandParams.join(","),
      })
      .reply(200, sampleDocument);

    const args = { path: testPath, expand: expandParams };
    await ploneGetContent(args);

    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if content retrieval fails (e.g., 404 Not Found)", async () => {
    Nock.default(testBaseUrl, { reqheaders: defaultReqHeaders })
      .get(`/++api++${testPath}`)
      .reply(404, "Not Found");

    const args = { path: testPath };
    await expect(ploneGetContent(args)).rejects.toThrow(
      "[GetContent] Request failed with status code 404",
    );
    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if Plone client is not configured", async () => {
    ploneHandlersSingleton.client = null;

    const args = { path: testPath };
    await expect(ploneGetContent(args)).rejects.toThrow(
      "Plone client not configured. Please run plone_configure first.",
    );
    expect(Nock.pendingMocks()).toHaveLength(0); // No API call should be made
  });
});

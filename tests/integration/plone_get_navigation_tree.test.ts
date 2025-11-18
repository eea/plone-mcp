import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Nock } from "../utils/test-helpers";
import { PloneMockServer } from "../utils/test-helpers";
import ploneGetNavigationTree from "../../src/tools/plone_get_navigation_tree";
import { ploneHandlersSingleton } from "../../src/plone-singleton";
import { PloneClient } from "../../src/plone-client";

describe("plone_get_navigation_tree", () => {
  let mockServer: PloneMockServer;
  const testBaseUrl = "http://localhost:8080/Plone";
  const mockNavigationTree = [
    {
      "@id": `${testBaseUrl}/++api++/front-page`,
      title: "Front Page",
      items: [],
    },
    {
      "@id": `${testBaseUrl}/++api++/news`,
      title: "News",
      items: [
        {
          "@id": `${testBaseUrl}/++api++/news/article-1`,
          title: "Article 1",
          items: [],
        },
      ],
    },
  ];
  const defaultReqHeaders = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  beforeEach(() => {
    mockServer = new PloneMockServer(testBaseUrl);
    ploneHandlersSingleton.client = new PloneClient({ baseUrl: testBaseUrl });
    // Removed global nock.matchHeader calls
  });

  afterEach(() => {
    Nock.cleanAll();
  });

  it("should successfully retrieve navigation tree from root with default depth", async () => {
    Nock.default(testBaseUrl)
      .get("/++api++/@navigation")
      .query({ depth: 2 })
      .reply(200, mockNavigationTree);

    const args = {}; // Default root_path and depth
    const result = await ploneGetNavigationTree(args);

    expect(JSON.parse(result.content[0].text)).toEqual(mockNavigationTree);
    expect(Nock.isDone()).toBe(true);
  });

  it("should successfully retrieve navigation tree from a specific path with custom depth", async () => {
    const customPath = "/some/path";
    const customDepth = 3;
    Nock.default(testBaseUrl)
      .get(`/++api++${customPath}/@navigation`)
      .query({ depth: customDepth })
      .reply(200, mockNavigationTree);

    const args = { root_path: customPath, depth: customDepth };
    const result = await ploneGetNavigationTree(args);

    expect(JSON.parse(result.content[0].text)).toEqual(mockNavigationTree);
    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if navigation tree retrieval fails", async () => {
    const customPath = "/non-existent";
    Nock.default(testBaseUrl, {
      reqheaders: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "user-agent": /.*/,
        "accept-encoding": /.*/,
      },
    })
      .get(`/++api++${customPath}/@navigation`)
      .query({ depth: 2 })
      .reply(500, "Server Error");

    const args = { root_path: customPath };
    await expect(ploneGetNavigationTree(args)).rejects.toThrow(
      "[GetNavigationTree] Request failed with status code 500",
    );
    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if Plone client is not configured", async () => {
    ploneHandlersSingleton.client = null;

    const args = {};
    await expect(ploneGetNavigationTree(args)).rejects.toThrow(
      "Plone client not configured. Please run plone_configure first.",
    );
    expect(Nock.pendingMocks()).toHaveLength(0); // No API call should be made
  });
});

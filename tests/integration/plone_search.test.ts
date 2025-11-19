import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Nock } from "../utils/test-helpers";
import { PloneMockServer, sampleSearchResults } from "../utils/test-helpers";
import ploneSearch from "../../src/tools/plone_search";
import { PloneClient } from "../../src/plone-client";
import { sessionManager } from "../../src/session-manager";
import { headers } from "xmcp/headers";

describe("plone_search", () => {
  let mockServer: PloneMockServer;
  const testBaseUrl = "http://localhost:8080/Plone";

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

  it("should successfully perform a basic search", async () => {
    const query = "annual report";
    mockServer.mockSearch({ SearchableText: query }, sampleSearchResults);

    const args = { query: query };
    const result = await ploneSearch(args);

    expect(JSON.parse(result.content[0].text)).toEqual(sampleSearchResults);
    expect(Nock.isDone()).toBe(true);
  });

  it("should perform search with all filters", async () => {
    const filters = {
      query: "filtered search",
      portal_type: ["Document", "Folder"],
      path: "/docs",
      review_state: ["published"],
      sort_on: "modified",
      sort_order: "descending",
      b_size: 10,
      b_start: 0,
    };

    mockServer.mockSearch(
      {
        SearchableText: filters.query,
        portal_type: filters.portal_type,
        path: filters.path,
        review_state: filters.review_state,
        sort_on: filters.sort_on,
        sort_order: filters.sort_order,
        b_size: filters.b_size,
        b_start: filters.b_start,
      },
      sampleSearchResults,
    );

    const args = filters;
    await ploneSearch(args);

    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if search fails", async () => {
    const query = "failing search";
    Nock(testBaseUrl)
      .get("/++api++/@search")
      .query({ SearchableText: query })
      .reply(500, "Server Error");

    const args = { query: query };
    await expect(ploneSearch(args)).rejects.toThrow(
      "[Search] Request failed with status code 500",
    );
    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if Plone client is not configured", async () => {
    const service = sessionManager.getSession(sessionId);
    service.client = null;

    const args = { query: "any" };
    await expect(ploneSearch(args)).rejects.toThrow(
      "Plone client not configured. Please run plone_configure first.",
    );
    expect(Nock.pendingMocks()).toHaveLength(0); // No API call should be made
  });
});

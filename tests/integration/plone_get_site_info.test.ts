import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Nock } from "../utils/test-helpers";
import { PloneMockServer } from "../utils/test-helpers";
import ploneGetSiteInfo from "../../src/tools/plone_get_site_info";
import { PloneClient } from "../../src/plone-client";
import { sessionManager } from "../../src/session-manager";
import { headers } from "xmcp/headers";

describe("plone_get_site_info", () => {
  let mockServer: PloneMockServer;
  const testBaseUrl = "http://localhost:8080/Plone";
  const mockSiteInfo = {
    "@id": `${testBaseUrl}/++api++/`,
    id: "plone",
    title: "Test Site",
    language: "en",
  };
  const defaultReqHeaders = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const sessionId = "test-session-id";

  beforeEach(() => {
    mockServer = new PloneMockServer(testBaseUrl);
    vi.mocked(headers).mockReturnValue({
      "mcp-session-id": sessionId,
    } as any);
    const service = sessionManager.getSession(sessionId);
    service.client = new PloneClient({ baseUrl: testBaseUrl });
  });

  afterEach(() => {
    Nock.cleanAll();
    sessionManager.clearSession(sessionId);
  });

  it("should successfully retrieve site information", async () => {
    mockServer.mockSiteRoot(mockSiteInfo);

    const result = await ploneGetSiteInfo({});

    expect(JSON.parse(result.content[0].text)).toEqual(mockSiteInfo);
    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if site information retrieval fails", async () => {
    Nock(testBaseUrl, {
      // nock.default is implied here if nock is a function
      reqheaders: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "user-agent": /.*/,
        "accept-encoding": /.*/,
      },
    })
      .get("/++api++")
      .reply(500, "Server Error");

    await expect(ploneGetSiteInfo({})).rejects.toThrow(
      "[GetSiteInfo] Request failed with status code 500",
    );
    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if Plone client is not configured", async () => {
    const service = sessionManager.getSession(sessionId);
    service.client = null;

    await expect(ploneGetSiteInfo({})).rejects.toThrow(
      "Plone client not configured. Please run plone_configure first.",
    );
    expect(Nock.pendingMocks()).toHaveLength(0); // No API call should be made
  });
});

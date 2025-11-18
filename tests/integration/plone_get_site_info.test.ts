import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Nock } from "../utils/test-helpers";
import { PloneMockServer } from "../utils/test-helpers";
import ploneGetSiteInfo from "../../src/tools/plone_get_site_info";
import { ploneHandlersSingleton } from "../../src/plone-singleton";
import { PloneClient } from "../../src/plone-client";

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

  beforeEach(() => {
    mockServer = new PloneMockServer(testBaseUrl);
    ploneHandlersSingleton.client = new PloneClient({ baseUrl: testBaseUrl });
    // Removed global nock.matchHeader calls
  });

  afterEach(() => {
    Nock.cleanAll();
  });

  it("should successfully retrieve site information", async () => {
    mockServer.mockSiteRoot(mockSiteInfo);

    const result = await ploneGetSiteInfo({});

    expect(JSON.parse(result.content[0].text)).toEqual(mockSiteInfo);
    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if site information retrieval fails", async () => {
    Nock.default(testBaseUrl, { // nock.default is implied here if nock is a function
      reqheaders: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "user-agent": /.*/,
        "accept-encoding": /.*/,
      },
    }).get("/++api++").reply(500, "Server Error");

    await expect(ploneGetSiteInfo({})).rejects.toThrow(
      "[GetSiteInfo] Request failed with status code 500",
    );
    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if Plone client is not configured", async () => {
    ploneHandlersSingleton.client = null;

    await expect(ploneGetSiteInfo({})).rejects.toThrow(
      "Plone client not configured. Please run plone_configure first.",
    );
    expect(Nock.pendingMocks()).toHaveLength(0); // No API call should be made
  });
});

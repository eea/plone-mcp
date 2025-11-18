import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Nock } from "../utils/test-helpers";
import { PloneMockServer } from "../utils/test-helpers";
import ploneGetTypes from "../../src/tools/plone_get_types";
import { ploneHandlersSingleton } from "../../src/plone-singleton";
import { PloneClient } from "../../src/plone-client";

describe("plone_get_types", () => {
  let mockServer: PloneMockServer;
  const testBaseUrl = "http://localhost:8080/Plone";
  const mockTypes = {
    Document: { title: "Page" },
    NewsItem: { title: "News Item" },
  };

  beforeEach(() => {
    mockServer = new PloneMockServer(testBaseUrl);
    ploneHandlersSingleton.client = new PloneClient({ baseUrl: testBaseUrl });
  });

  afterEach(() => {
    Nock.cleanAll();
  });

  it("should successfully retrieve content types", async () => {
    mockServer.mockTypes(mockTypes);

    const result = await ploneGetTypes({});

    expect(JSON.parse(result.content[0].text)).toEqual(mockTypes);
    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if content types retrieval fails", async () => {
    Nock.default(testBaseUrl, {
      reqheaders: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "user-agent": /.*/,
        "accept-encoding": /.*/,
      },
    }).get("/++api++/@types").reply(500, "Server Error");

    await expect(ploneGetTypes({})).rejects.toThrow(
      "[GetTypes] Request failed with status code 500",
    );
    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if Plone client is not configured", async () => {
    ploneHandlersSingleton.client = null;

    await expect(ploneGetTypes({})).rejects.toThrow(
      "Plone client not configured. Please run plone_configure first.",
    );
    expect(Nock.pendingMocks()).toHaveLength(0); // No API call should be made
  });
});

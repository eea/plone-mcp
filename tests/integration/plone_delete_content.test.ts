import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Nock } from "../utils/test-helpers";
import { PloneMockServer } from "../utils/test-helpers";
import ploneDeleteContent from "../../src/tools/plone_delete_content";
import { ploneHandlersSingleton } from "../../src/plone-singleton";
import { PloneClient } from "../../src/plone-client";

describe("plone_delete_content", () => {
  let mockServer: PloneMockServer;
  const testBaseUrl = "http://localhost:8080/Plone";
  const testPath = "/my-old-page";

  beforeEach(() => {
    mockServer = new PloneMockServer(testBaseUrl);
    ploneHandlersSingleton.client = new PloneClient({ baseUrl: testBaseUrl });
  });

  afterEach(() => {
    Nock.cleanAll();
  });

  it("should successfully delete content", async () => {
    mockServer.mockContentDelete(testPath);

    const args = { path: testPath };
    const result = await ploneDeleteContent(args);

    expect(result.content[0].text).toContain(
      `Successfully deleted content at path: ${testPath}`,
    );
    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if content deletion fails (e.g., 404 Not Found)", async () => {
    Nock.default(testBaseUrl, {
      reqheaders: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "user-agent": /.*/,
        "accept-encoding": /.*/,
      },
    }).delete(`/++api++${testPath}`).reply(404, "Not Found");

    const args = { path: testPath };
    await expect(ploneDeleteContent(args)).rejects.toThrow(
      "[DeleteContent] Request failed with status code 404",
    );
    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if Plone client is not configured", async () => {
    ploneHandlersSingleton.client = null;

    const args = { path: testPath };
    await expect(ploneDeleteContent(args)).rejects.toThrow(
      "Plone client not configured. Please run plone_configure first.",
    );
    expect(Nock.pendingMocks()).toHaveLength(0); // No API call should be made
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { cleanupNock, isNockDone, getPendingNocks } from "../utils/test-helpers";
import { PloneMockServer, sampleWorkflowInfo } from "../utils/test-helpers";
import ploneGetWorkflowInfo from "../../src/tools/plone_get_workflow_info";
import { ploneHandlersSingleton } from "../../src/plone-singleton";
import { PloneClient } from "../../src/plone-client";

describe("plone_get_workflow_info", () => {
  let mockServer: PloneMockServer;
  const testBaseUrl = "http://localhost:8080/Plone";
  const testPath = "/my-document";

  beforeEach(() => {
    mockServer = new PloneMockServer(testBaseUrl);
    ploneHandlersSingleton.client = new PloneClient({ baseUrl: testBaseUrl });
  });

  afterEach(() => {
    cleanupNock();
  });

  it("should successfully retrieve workflow information", async () => {
    mockServer.mockWorkflow(testPath, sampleWorkflowInfo);

    const args = { path: testPath };
    const result = await ploneGetWorkflowInfo(args);

    expect(JSON.parse(result.content[0].text)).toEqual(sampleWorkflowInfo);
    expect(isNockDone()).toBe(true);
  });

  it("should throw an error if workflow information retrieval fails", async () => {
    nock(testBaseUrl, {
          reqheaders: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "user-agent": /.*/,
            "accept-encoding": /.*/,
          },
        }).get(`/++api++${testPath}/@workflow`).reply(404, "Not Found");

    const args = { path: testPath };
    await expect(ploneGetWorkflowInfo(args)).rejects.toThrow(
      "[GetWorkflowInfo] Request failed with status code 404",
    );
    expect(isNockDone()).toBe(true);
  });

  it("should throw an error if Plone client is not configured", async () => {
    ploneHandlersSingleton.client = null;

    const args = { path: testPath };
    await expect(ploneGetWorkflowInfo(args)).rejects.toThrow(
      "Plone client not configured. Please run plone_configure first.",
    );
    expect(nock.pendingMocks()).toHaveLength(0); // No API call should be made
  });
});

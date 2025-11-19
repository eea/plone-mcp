import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Nock } from "plone-mcp/tests/utils/test-helpers";
import { PloneMockServer, sampleWorkflowInfo } from "plone-mcp/tests/utils/test-helpers";
import ploneGetWorkflowInfo from "plone-mcp/tools/plone_get_workflow_info";
import { PloneClient } from "plone-mcp/plone-client";
import { sessionManager } from "plone-mcp/session-manager";
import { headers } from "xmcp/headers";

describe("plone_get_workflow_info", () => {
  let mockServer: PloneMockServer;
  const testBaseUrl = "http://localhost:8080/Plone";
  const testPath = "/my-document";

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

  it("should successfully retrieve workflow information", async () => {
    mockServer.mockWorkflow(testPath, sampleWorkflowInfo);

    const args = { path: testPath };
    const result = await ploneGetWorkflowInfo(args);

    expect(JSON.parse(result.content[0].text)).toEqual(sampleWorkflowInfo);
    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if workflow information retrieval fails", async () => {
    Nock(testBaseUrl, {
      reqheaders: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "user-agent": /.*/,
        "accept-encoding": /.*/,
      },
    })
      .get(`/++api++${testPath}/@workflow`)
      .reply(404, "Not Found");

    const args = { path: testPath };
    await expect(ploneGetWorkflowInfo(args)).rejects.toThrow(
      "[GetWorkflowInfo] Request failed with status code 404",
    );
    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if Plone client is not configured", async () => {
    const service = sessionManager.getSession(sessionId);
    service.client = null;

    const args = { path: testPath };
    await expect(ploneGetWorkflowInfo(args)).rejects.toThrow(
      "Plone client not configured. Please run plone_configure first.",
    );
    expect(Nock.pendingMocks()).toHaveLength(0); // No API call should be made
  });
});

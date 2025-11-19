import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Nock } from "../utils/test-helpers";
import { PloneMockServer, sampleWorkflowInfo } from "../utils/test-helpers";
import ploneTransitionWorkflow from "../../src/tools/plone_transition_workflow";
import { PloneClient } from "../../src/plone-client";
import { sessionManager } from "../../src/session-manager";
import { headers } from "xmcp/headers";

describe("plone_transition_workflow", () => {
  let mockServer: PloneMockServer;
  const testBaseUrl = "http://localhost:8080/Plone";
  const testPath = "/my-document";
  const transitionName = "publish";

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

  it("should successfully execute a workflow transition", async () => {
    mockServer.mockWorkflowTransition(
      testPath,
      transitionName,
      sampleWorkflowInfo,
    );

    const args = { path: testPath, transition: transitionName };
    const result = await ploneTransitionWorkflow(args);

    expect(JSON.parse(result.content[0].text)).toEqual(sampleWorkflowInfo);
    expect(Nock.isDone()).toBe(true);
  });

  it("should execute a workflow transition with a comment", async () => {
    const comment = "Publishing for review";
    mockServer.mockWorkflowTransition(
      testPath,
      transitionName,
      sampleWorkflowInfo,
      {
        transition: transitionName,
        comment,
      },
    );

    const args = { path: testPath, transition: transitionName, comment: comment };
    await ploneTransitionWorkflow(args);

    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if workflow transition fails", async () => {
    Nock(testBaseUrl, {
      reqheaders: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "user-agent": /.*/,
        "accept-encoding": /.*/,
      },
    }).post(`/++api++${testPath}/@workflow/${transitionName}`).reply(400, "Bad Request");

    const args = { path: testPath, transition: transitionName };
    await expect(ploneTransitionWorkflow(args)).rejects.toThrow(
      "[TransitionWorkflow] Request failed with status code 400",
    );
    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if Plone client is not configured", async () => {
    const service = sessionManager.getSession(sessionId);
    service.client = null;

    const args = { path: testPath, transition: transitionName };
    await expect(ploneTransitionWorkflow(args)).rejects.toThrow(
      "Plone client not configured. Please run plone_configure first.",
    );
    expect(Nock.pendingMocks()).toHaveLength(0); // No API call should be made
  });
});

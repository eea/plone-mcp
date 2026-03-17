import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { headers } from "xmcp/headers";
import { Nock, PloneMockServer } from "plone-mcp/__tests__/utils/test-helpers";
import ploneCreateUser, { schema } from "plone-mcp/tools/plone_create_user";
import { sessionManager } from "plone-mcp/session-manager";
import { PloneClient } from "plone-mcp/plone-client";
import type { InferSchema } from "xmcp";

vi.mock("xmcp/headers", () => ({
  headers: vi.fn(),
}));

describe("plone_create_user", () => {
  let mockServer: PloneMockServer;
  const testBaseUrl = "http://localhost:8080/Plone";
  const sessionId = "test-session-id";

  beforeEach(() => {
    vi.mocked(headers).mockReturnValue({
      "mcp-session-id": sessionId,
    });
    mockServer = new PloneMockServer(testBaseUrl);
    const service = sessionManager.getSession(sessionId);
    service.client = new PloneClient({ baseUrl: testBaseUrl });
  });

  afterEach(() => {
    Nock.cleanAll();
    vi.restoreAllMocks();
  });

  it("should successfully create a user", async () => {
    const userData = {
      username: "jdoe",
      password: "password123",
      email: "jdoe@example.com",
      fullname: "John Doe",
    };

    const responseData = {
      ...userData,
      "@id": `${testBaseUrl}/++api++/@users/jdoe`,
      id: "jdoe",
    };

    Nock(testBaseUrl)
      .post("/++api++/@users", userData)
      .reply(201, responseData);

    const args: InferSchema<typeof schema> = userData;
    const result = await ploneCreateUser(args);

    expect(JSON.parse(result.content[0].text)).toEqual(responseData);
    expect(Nock.isDone()).toBe(true);
  });

  it("should throw an error if user creation fails", async () => {
    const userData = {
      username: "jdoe",
      password: "password123",
    };

    Nock(testBaseUrl)
      .post("/++api++/@users", userData)
      .reply(400, { message: "Username already exists" });

    const args: InferSchema<typeof schema> = userData;
    await expect(ploneCreateUser(args)).rejects.toThrow(
      "[CreateUser] Request failed with status code 400",
    );
    expect(Nock.isDone()).toBe(true);
  });
});

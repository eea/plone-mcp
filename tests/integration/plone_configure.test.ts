import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Nock } from "../utils/test-helpers"; // Use Nock from test-helpers
import { PloneMockServer } from "../utils/test-helpers";
import ploneConfigure from "../../src/tools/plone_configure";
import { ploneHandlersSingleton } from "../../src/plone-singleton";
import { PloneClient } from "../../src/plone-client"; // Import PloneClient to check its instance

describe("plone_configure", () => {
  let mockServer: PloneMockServer;
  const testBaseUrl = "http://localhost:8080/Plone";
  const mockSiteRootResponse = {
    "@type": "Plone Site",
    id: "plone",
    title: "Test Site",
  };

  beforeEach(() => {
    mockServer = new PloneMockServer(testBaseUrl);
    // Ensure the singleton client is null before each test
    ploneHandlersSingleton.client = null;
  });

  afterEach(() => {
    Nock.cleanAll(); // Use Nock.cleanAll()
  });

  it("should successfully configure the Plone client with valid credentials", async () => {
    Nock.default(testBaseUrl, {
      reqheaders: {
        authorization: "Basic YWRtaW46YWRtaW4=",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })
      .get("/++api++")
      .reply(200, mockSiteRootResponse);

    const args = {
      baseUrl: testBaseUrl,
      username: "admin",
      password: "admin",
    };

    const result = await ploneConfigure(args);

    expect(result.content[0].text).toEqual(
      `Successfully configured connection to Plone site: ${testBaseUrl}`,
    );
    expect(ploneHandlersSingleton.client).toBeInstanceOf(PloneClient);
    expect(ploneHandlersSingleton.client?.baseUrl).toBe(testBaseUrl);
    expect(Nock.isDone()).toBe(true); // Use Nock.isDone()
  });

  it("should successfully configure the Plone client with a token", async () => {
    Nock.default(testBaseUrl, {
      reqheaders: {
        authorization: "Bearer test-token",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })
      .get("/++api++")
      .reply(200, mockSiteRootResponse);

    const args = {
      baseUrl: testBaseUrl,
      token: "test-token",
    };

    const result = await ploneConfigure(args);

    expect(result.content[0].text).toEqual(
      `Successfully configured connection to Plone site: ${testBaseUrl}`,
    );
    expect(ploneHandlersSingleton.client).toBeInstanceOf(PloneClient);
    expect(ploneHandlersSingleton.client?.token).toBe("test-token");
    expect(Nock.isDone()).toBe(true); // Use Nock.isDone()
  });

  it("should throw an error if configuration fails (e.g., unauthorized)", async () => {
    Nock.default(testBaseUrl, {
      reqheaders: {
        authorization: "Basic YmFkdXNlcjpiYWRwYXNzd29yZA==",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })
      .get("/++api++")
      .reply(401, { error: "Unauthorized" });

    const args = {
      baseUrl: testBaseUrl,
      username: "baduser",
      password: "badpassword",
    };

    await expect(ploneConfigure(args)).rejects.toThrow(
      "[Configure] Request failed with status code 401",
    );
    expect(ploneHandlersSingleton.client).toBeNull(); // Client should not be set on failure
    expect(Nock.isDone()).toBe(true); // Use Nock.isDone()
  });

  it("should throw an error if baseUrl is invalid", async () => {
    const args = {
      baseUrl: "invalid-url",
      username: "admin",
      password: "admin",
    };

    await expect(ploneConfigure(args)).rejects.toThrow(
      "[Configure] Invalid base URL: invalid-url",
    );
    expect(ploneHandlersSingleton.client).toBeNull();
    expect(Nock.pendingMocks()).toHaveLength(0); // Use Nock.pendingMocks()
  });

  it("should prioritize arguments over environment variables", async () => {
    process.env.PLONE_BASE_URL = "http://env.plone.com";
    process.env.PLONE_USERNAME = "envuser";
    process.env.PLONE_PASSWORD = "envpass";

    Nock.default(testBaseUrl, {
      reqheaders: {
        authorization: "Basic YXJndXNlcjphcmdwYXNz",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })
      .get("/++api++")
      .reply(200, mockSiteRootResponse);

    const args = {
      baseUrl: testBaseUrl,
      username: "arguser",
      password: "argpass",
    };

    const result = await ploneConfigure(args);

    expect(result.content[0].text).toEqual(
      `Successfully configured connection to Plone site: ${testBaseUrl}`,
    );
    expect(ploneHandlersSingleton.client?.baseUrl).toBe(testBaseUrl);
    // Cleanup env vars
    delete process.env.PLONE_BASE_URL;
    delete process.env.PLONE_USERNAME;
    delete process.env.PLONE_PASSWORD;
    expect(Nock.isDone()).toBe(true); // Use Nock.isDone()
  });

  it("should use environment variables if arguments are empty", async () => {
    process.env.PLONE_BASE_URL = "http://env.plone.com";
    process.env.PLONE_USERNAME = "envuser";
    process.env.PLONE_PASSWORD = "envpass";

    Nock.default(process.env.PLONE_BASE_URL, {
      reqheaders: {
        authorization: "Basic ZW52dXNlcjplbnZwYXNz",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })
      .get("/++api++")
      .reply(200, mockSiteRootResponse);

    expect(result.content[0].text).toEqual(
      `Successfully configured connection to Plone site: ${process.env.PLONE_BASE_URL}`,
    );
    expect(ploneHandlersSingleton.client?.baseUrl).toBe(process.env.PLONE_BASE_URL);
    // Cleanup env vars
    delete process.env.PLONE_BASE_URL;
    delete process.env.PLONE_USERNAME;
    delete process.env.PLONE_PASSWORD;
    expect(Nock.isDone()).toBe(true); // Use Nock.isDone()
  });
});

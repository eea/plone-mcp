// Global test setup
import { cleanupNock, Nock } from "plone-mcp/tests/utils/test-helpers";
import { beforeAll, afterAll, afterEach, vi } from "vitest";

// Disable actual HTTP requests during tests
beforeAll(() => {
  Nock.disableNetConnect();
  // Allow localhost connections for integration tests
  Nock.enableNetConnect("127.0.0.1");
});

afterAll(() => {
  Nock.enableNetConnect();
});

vi.mock("xmcp/headers", () => {
  return {
    headers: vi.fn().mockReturnValue({}),
  };
});

// Clean up after each test
afterEach(() => {
  cleanupNock();
});

// Global test setup
import { cleanupNock, Nock } from "./utils/test-helpers"; // Added Nock import

// Disable actual HTTP requests during tests
beforeAll(() => {
  Nock.disableNetConnect();
  // Allow localhost connections for integration tests
  Nock.enableNetConnect("127.0.0.1");
});

afterAll(() => {
  Nock.enableNetConnect();
});

// Clean up after each test
afterEach(() => {
  cleanupNock();
});

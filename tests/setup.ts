// Global test setup

// Use dynamic import for nock to avoid "Cannot use import statement outside a module" error
let nock: any; // Declare nock as any to avoid TS errors with dynamic import
beforeAll(async () => {
  nock = (await import("nock")).default;
  nock.disableNetConnect();
  // Allow localhost connections for integration tests
  nock.enableNetConnect("127.0.0.1");
});

afterAll(() => {
  nock.enableNetConnect();
});

// Clean up after each test
afterEach(() => {
  nock.cleanAll();
});

// Increase timeout for integration tests
jest.setTimeout(30000);

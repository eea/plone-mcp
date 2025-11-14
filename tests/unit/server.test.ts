import { PloneMCPServer } from "../../src/index"; // Adjust path as needed
import nock from "nock";
import { vi } from "vitest";

// Define the mock functions and the mock constructor within the vi.mock factory
// and export them so they can be imported and asserted against in the tests.
const mockMcpServerModule = vi.hoisted(() => {
  const mockRegisterTool = vi.fn();
  const mockRegisterResource = vi.fn();
  const mockRegisterPrompt = vi.fn();
  const mockConnect = vi.fn();
  const mockServerOnError = vi.fn();
  const mockServerClose = vi.fn();

  const MockMcpServer = vi.fn(function () {
    this.registerTool = mockRegisterTool;
    this.registerResource = mockRegisterResource;
    this.registerPrompt = mockRegisterPrompt;
    this.connect = mockConnect;
    this.server = {
      onerror: mockServerOnError,
      close: mockServerClose,
    };
  });

  // Mock ResourceTemplate
  const MockResourceTemplate = vi.fn(function (template: string, options: any) {
    // We don't need to mock its internal behavior for these tests,
    // just ensure it can be instantiated.
    this.template = template;
    this.options = options;
  });

  return {
    McpServer: MockMcpServer,
    ResourceTemplate: MockResourceTemplate, // Export ResourceTemplate
    mockRegisterTool,
    mockRegisterResource,
    mockRegisterPrompt,
    mockConnect,
    mockServerOnError,
    mockServerClose,
  };
});

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => mockMcpServerModule);

// Now, import the mock functions from the hoisted mock
const { mockRegisterTool } = mockMcpServerModule;

describe("PloneMCPServer Tool Registration with ENABLED_TOOLS", () => {
  let originalEnv: NodeJS.ProcessEnv;
  const allToolNames = [
    "plone_get_content",
    "plone_create_content",
    "plone_update_content",
    "plone_delete_content",
    "plone_search",
    "plone_get_site_info",
    "plone_get_types",
    "plone_get_vocabularies",
    "plone_get_workflow_info",
    "plone_transition_workflow",
    "plone_get_navigation_tree",
    "plone_get_block_schemas",
    "plone_create_blocks_layout",
    "plone_add_single_block",
    "plone_update_single_block",
    "plone_remove_single_block",
  ]; // Excludes plone_configure, which is always enabled

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv }; // Clone original env to modify
    vi.clearAllMocks(); // Clear all vi.fn() mocks
    nock.cleanAll(); // Clean all nock mocks
  });

  afterEach(() => {
    process.env = originalEnv; // Restore original env
    nock.cleanAll(); // Ensure nock is clean
  });

  it("should register only plone_configure when ENABLED_TOOLS is empty", () => {
    process.env.ENABLED_TOOLS = "";
    new PloneMCPServer();

    // Access the mock calls directly from the prototype's vi.fn()
    const registeredTools = mockRegisterTool.mock.calls.map((call) => call[0]);

    expect(registeredTools).toEqual(["plone_configure"]);
  });

  it("should register only plone_configure when ENABLED_TOOLS contains unknown tools", () => {
    process.env.ENABLED_TOOLS = "unknown_tool_1,unknown_tool_2";
    new PloneMCPServer();

    const registeredTools = mockRegisterTool.mock.calls.map((call) => call[0]);

    expect(registeredTools).toEqual(["plone_configure"]);
  });

  it("should register all tools when ENABLED_TOOLS is not set", () => {
    delete process.env.ENABLED_TOOLS; // Ensure it's not set
    new PloneMCPServer();

    const registeredTools = mockRegisterTool.mock.calls.map((call) => call[0]);

    expect(registeredTools).toEqual(["plone_configure", ...allToolNames]);
    expect(registeredTools).toHaveLength(allToolNames.length + 1); // All tools + plone_configure
  });

  it("should register only specified tools when ENABLED_TOOLS is set", () => {
    const enabledSubset = ["plone_get_content", "plone_create_content"];
    process.env.ENABLED_TOOLS = enabledSubset.join(",");
    new PloneMCPServer();

    const registeredTools = mockRegisterTool.mock.calls.map((call) => call[0]);

    expect(registeredTools).toEqual(["plone_configure", ...enabledSubset]);
    expect(registeredTools).toHaveLength(enabledSubset.length + 1);
  });

  it("should register specified tools along with plone_configure when ENABLED_TOOLS includes plone_configure", () => {
    const enabledSubset = ["plone_configure", "plone_get_content"];
    process.env.ENABLED_TOOLS = enabledSubset.join(",");
    new PloneMCPServer();

    const registeredTools = mockRegisterTool.mock.calls.map((call) => call[0]);

    // plone_configure should only appear once, even if explicitly enabled
    expect(registeredTools).toEqual(["plone_configure", "plone_get_content"]);
    expect(registeredTools).toHaveLength(2);
  });
});

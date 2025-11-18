import * as nock from "nock"; // Import as namespace

export const Nock = nock; // Export the entire namespace object

export const cleanupNock = () => nock.cleanAll();
export const isNockDone = () => nock.isDone();
export const getPendingNocks = () => nock.pendingMocks();

export class PloneMockServer {
  private baseUrl: string;
  private defaultReqHeaders = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  constructor(baseUrl: string = "https://test.plone.com") {
    this.baseUrl = baseUrl;
  }

  private normalizePath(path: string): string {
    if (!path || path === "/") {
      return "";
    }
    return path.startsWith("/") ? path : `/${path}`;
  }

  mockSiteRoot(
    response = { "@type": "Plone Site", id: "plone", title: "Test Site" },
  ) {
    return nock
      .default(this.baseUrl, { reqheaders: this.defaultReqHeaders }) // Use nock.default
      .get("/++api++")
      .reply(200, response);
  }

  mockContentGet(path: string, response: any) {
    const normalizedPath = this.normalizePath(path);
    return nock
      .default(this.baseUrl, { reqheaders: this.defaultReqHeaders }) // Use nock.default
      .get(`/++api++${normalizedPath}`)
      .reply(200, response);
  }

  mockContentCreate(
    path: string,
    requestMatcher: any,
    responseOrStatus: any,
    maybeBody?: any,
  ) {
    const normalizedPath = this.normalizePath(path);
    const { status, body } =
      typeof responseOrStatus === "number"
        ? { status: responseOrStatus, body: maybeBody }
        : { status: 201, body: responseOrStatus };

    return nock
      .default(this.baseUrl, { reqheaders: this.defaultReqHeaders }) // Use nock.default
      .post(`/++api++${normalizedPath}`, requestMatcher)
      .reply(status, body);
  }

  mockContentUpdate(
    path: string,
    requestMatcher: any,
    responseOrStatus: any,
    maybeBody?: any,
  ) {
    const normalizedPath = this.normalizePath(path);
    const { status, body } =
      typeof responseOrStatus === "number"
        ? { status: responseOrStatus, body: maybeBody }
        : { status: 200, body: responseOrStatus };

    return nock
      .default(this.baseUrl, { reqheaders: this.defaultReqHeaders }) // Use nock.default
      .patch(`/++api++${normalizedPath}`, requestMatcher)
      .reply(status, body);
  }

  mockContentDelete(path: string, status: number = 204, body?: any) {
    const normalizedPath = this.normalizePath(path);
    return nock
      .default(this.baseUrl, { reqheaders: this.defaultReqHeaders }) // Use nock.default
      .delete(`/++api++${normalizedPath}`)
      .reply(status, body);
  }

  mockSearch(query: any, response: any) {
    const serializedQuery: Record<string, any> = {};

    Object.entries(query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        const targetKey = key.endsWith("[]") ? key : `${key}[]`;
        serializedQuery[targetKey] =
          value.length === 1 ? value[0] : value;
        return;
      }

      if (typeof value === "number") {
        serializedQuery[key] = value.toString();
        return;
      }

      serializedQuery[key] = value;
    });

    return nock
      .default(this.baseUrl, { reqheaders: this.defaultReqHeaders }) // Use nock.default
      .get("/++api++/@search")
      .query(serializedQuery)
      .reply(200, response);
  }

  mockWorkflow(path: string, response: any) {
    return nock.default(this.baseUrl, { reqheaders: this.defaultReqHeaders }) // Use nock.default
      .get(`/++api++${path}/@workflow`).reply(200, response);
  }

  mockWorkflowTransition(
    path: string,
    transition: string,
    response: any,
    bodyMatcher?: nock.RequestBodyMatcher,
  ) {
    const scope = nock.default(this.baseUrl, {
      reqheaders: this.defaultReqHeaders,
    }); // Use nock.default

    if (bodyMatcher !== undefined) {
      return scope
        .post(`/++api++${path}/@workflow/${transition}`, bodyMatcher)
        .reply(200, response);
    }

    return scope
      .post(`/++api++${path}/@workflow/${transition}`)
      .reply(200, response);
  }

  mockTypes(response: any) {
    return nock.default(this.baseUrl, { reqheaders: this.defaultReqHeaders }) // Use nock.default
      .get("/++api++/@types").reply(200, response);
  }

  mockVocabularies(vocabulary: string, response: any) {
    return nock.default(this.baseUrl, { reqheaders: this.defaultReqHeaders }) // Use nock.default
      .get(`/++api++/@vocabularies/${vocabulary}`)
      .reply(200, response);
  }
}

export const sampleDocument = {
  "@type": "Document",
  "@id": "https://test.plone.com/test-document",
  id: "test-document",
  title: "Test Document",
  description: "A test document",
  blocks: {
    "block-1": {
      "@type": "slate",
      value: [
        {
          type: "p",
          children: [{ text: "This is a test paragraph." }],
        },
      ],
      plaintext: "This is a test paragraph.",
    },
  },
  blocks_layout: {
    items: ["block-1"],
  },
};

export const sampleSearchResults = {
  "@id": "https://test.plone.com/++api++/@search",
  items: [
    {
      "@id": "https://test.plone.com/document1",
      "@type": "Document",
      title: "Document 1",
      description: "First document",
    },
    {
      "@id": "https://test.plone.com/document2",
      "@type": "Document",
      title: "Document 2",
      description: "Second document",
    },
  ],
  items_total: 2,
  batching: {
    "@id": "https://test.plone.com/++api++/@search",
    first: "https://test.plone.com/++api++/@search?b_start=0",
    last: "https://test.plone.com/++api++/@search?b_start=0",
  },
};

export const sampleWorkflowInfo = {
  "@id": "https://test.plone.com/test-document/@workflow",
  history: [],
  transitions: [
    {
      "@id": "https://test.plone.com/test-document/@workflow/publish",
      title: "Publish",
    },
  ],
  state: {
    id: "private",
    title: "Private",
  },
};

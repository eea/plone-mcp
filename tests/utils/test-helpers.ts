import nock from "nock";

export const Nock = nock;

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
    response: Record<string, unknown> = { "@type": "Plone Site", id: "plone", title: "Test Site" },
  ) {
    return nock(this.baseUrl, { reqheaders: this.defaultReqHeaders })
      .get("/++api++")
      .reply(200, response);
  }

  mockContentGet(path: string, response: unknown) {
    const normalizedPath = this.normalizePath(path);
    return nock(this.baseUrl, { reqheaders: this.defaultReqHeaders })
      .get(`/++api++${normalizedPath}`)
      .reply(200, response);
  }

  mockContentCreate(
    path: string,
    requestMatcher: nock.RequestBodyMatcher | Record<string, unknown>,
    responseOrStatus: unknown,
    maybeBody?: unknown,
  ) {
    const normalizedPath = this.normalizePath(path);
    const { status, body } =
      typeof responseOrStatus === "number"
        ? { status: responseOrStatus, body: maybeBody }
        : { status: 201, body: responseOrStatus };

    return nock(this.baseUrl, { reqheaders: this.defaultReqHeaders })
      .post(`/++api++${normalizedPath}`, requestMatcher)
      .reply(status, body);
  }

  mockContentUpdate(
    path: string,
    requestMatcher: nock.RequestBodyMatcher | Record<string, unknown>,
    responseOrStatus: unknown,
    maybeBody?: unknown,
  ) {
    const normalizedPath = this.normalizePath(path);
    const { status, body } =
      typeof responseOrStatus === "number"
        ? { status: responseOrStatus, body: maybeBody }
        : { status: 200, body: responseOrStatus };

    return nock(this.baseUrl, { reqheaders: this.defaultReqHeaders })
      .patch(`/++api++${normalizedPath}`, requestMatcher)
      .reply(status, body);
  }

  mockContentDelete(path: string, status: number = 204, body?: unknown) {
    const normalizedPath = this.normalizePath(path);
    return nock(this.baseUrl, { reqheaders: this.defaultReqHeaders })
      .delete(`/++api++${normalizedPath}`)
      .reply(status, body);
  }

  mockSearch(query: Record<string, string | string[] | number>, response: unknown) {
    const serializedQuery: Record<string, unknown> = {};

    Object.entries(query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        const targetKey = key.endsWith("[]") ? key : `${key}[]`;
        serializedQuery[targetKey] = value.length === 1 ? value[0] : value;
        return;
      }

      if (typeof value === "number") {
        serializedQuery[key] = value.toString();
        return;
      }

      serializedQuery[key] = value;
    });

    return nock(this.baseUrl, { reqheaders: this.defaultReqHeaders })
      .get("/++api++/@search")
      .query(serializedQuery)
      .reply(200, response);
  }

  mockWorkflow(path: string, response: unknown) {
    return nock(this.baseUrl, { reqheaders: this.defaultReqHeaders })
      .get(`/++api++${path}/@workflow`)
      .reply(200, response);
  }

  mockWorkflowTransition(
    path: string,
    transition: string,
    response: unknown,
    bodyMatcher?: nock.RequestBodyMatcher,
  ) {
    const scope = nock(this.baseUrl, {
      reqheaders: this.defaultReqHeaders,
    });

    if (bodyMatcher !== undefined) {
      return scope
        .post(`/++api++${path}/@workflow/${transition}`, bodyMatcher)
        .reply(200, response);
    }

    return scope
      .post(`/++api++${path}/@workflow/${transition}`)
      .reply(200, response);
  }

  mockTypes(response: unknown) {
    return nock(this.baseUrl, { reqheaders: this.defaultReqHeaders })
      .get("/++api++/@types")
      .reply(200, response);
  }

  mockVocabularies(vocabulary: string, response: unknown) {
    return nock(this.baseUrl, { reqheaders: this.defaultReqHeaders })
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

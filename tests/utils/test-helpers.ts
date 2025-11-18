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

  mockSiteRoot(
    response = { "@type": "Plone Site", id: "plone", title: "Test Site" },
  ) {
    return nock.default(this.baseUrl, { reqheaders: this.defaultReqHeaders }) // Use nock.default
      .get("/++api++/").reply(200, response);
  }

  mockContentGet(path: string) {
    return nock.default(this.baseUrl, { reqheaders: this.defaultReqHeaders }) // Use nock.default
      .get(`/++api++${path}`);
  }

  mockContentCreate(path: string, requestMatcher: any, response: any) {
    return nock.default(this.baseUrl, { reqheaders: this.defaultReqHeaders }) // Use nock.default
      .post(`/++api++${path}`, requestMatcher)
      .reply(201, response);
  }

  mockContentUpdate(path: string, requestMatcher: any, response: any) {
    return nock.default(this.baseUrl, { reqheaders: this.defaultReqHeaders }) // Use nock.default
      .patch(`/++api++${path}`, requestMatcher)
      .reply(200, response);
  }

  mockContentDelete(path: string) {
    return nock.default(this.baseUrl, { reqheaders: this.defaultReqHeaders }) // Use nock.default
      .delete(`/++api++${path}`).reply(204);
  }

  mockSearch(query: any, response: any) {
    return nock.default(this.baseUrl, { reqheaders: this.defaultReqHeaders }) // Use nock.default
      .get("/++api++/@search")
      .query(query).reply(200, response);
  }

  mockWorkflow(path: string, response: any) {
    return nock.default(this.baseUrl, { reqheaders: this.defaultReqHeaders }) // Use nock.default
      .get(`/++api++${path}/@workflow`).reply(200, response);
  }

  mockWorkflowTransition(path: string, transition: string, response: any) {
    return nock.default(this.baseUrl, { reqheaders: this.defaultReqHeaders }) // Use nock.default
      .post(`/++api++${path}/@workflow/${transition}`).reply(200, response);
  }

  mockTypes(response: any) {
    return nock.default(this.baseUrl, { reqheaders: this.defaultReqHeaders }) // Use nock.default
      .get("/++api++/@types").reply(200, response);
  }

  mockVocabularies(vocabulary: string) {
    return nock.default(this.baseUrl, { reqheaders: this.defaultReqHeaders }) // Use nock.default
      .get(`/++api++/@vocabularies/${vocabulary}`);
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

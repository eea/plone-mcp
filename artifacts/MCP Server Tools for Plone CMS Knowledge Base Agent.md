![][image1]

**MCP Server Tools for Plone CMS Knowledge Base Agent**

**Inspired by [https://blog.langchain.com/rebuilding-chat-langchain/](https://blog.langchain.com/rebuilding-chat-langchain/)**

Based on the LangChain chat rebuild architecture[\[1\]](#bookmark=id.juio3npnilbl) and Plone's REST API capabilities[\[1\]](#bookmark=id.juio3npnilbl)[\[2\]](#bookmark=id.cijiahpcd64d)[\[3\]](#bookmark=id.dts2h22p9t97), here's a comprehensive list of MCP tool functions designed for a Plone CMS knowledge base support agent serving thousands of pages.

**Core Architecture Principles**

The LangChain team rebuilt their chatbot around three key resource domains: **documentation search**, **knowledge base search**, and **codebase search**[\[1\]](#bookmark=id.juio3npnilbl). For Plone, we'll adapt this to: **content search**, **navigation/structure discovery**, and **metadata/workflow queries**.

Key insights from LangChain's approach[\[1\]](#bookmark=id.juio3npnilbl):

* Direct API access is superior to vector embeddings for structured content

* Tools should mirror human search workflows (scan titles, then read full content)

* Agents should refine queries iteratively with 4-6 tool calls

* Full pages with context are better than fragmented chunks

**MCP Tool Functions for Plone**

**1\. Full-Text Content Search**

**Tool Name:** `search_plone_content`

**Description:** Search across all Plone content using full-text SearchableText index. Returns complete pages with metadata, not fragments. Supports iterative refinement with multiple search terms.

**Parameters:**

* `query` (string, required): Search terms for full-text search

* `portal_type` (array, optional): Filter by content types (Document, News Item, Event, etc.)

* `path` (string, optional): Limit search to specific folder path

* `page_size` (integer, optional, default=10): Number of results to return

* `sort_on` (string, optional): Sort field (Date, modified, effective)

* `review_state` (array, optional): Filter by workflow state (published, private, etc.)

**Plone REST API Implementation:**

`# Primary endpoint: /@search or /@querystring-search`  
`GET /plone/@search?SearchableText=<query>&portal_type=Document&b_size=10`

`# Alternative for complex queries`  
`POST /plone/@querystring-search`  
`{`  
  `"query": [`  
    `{`  
      `"i": "SearchableText",`  
      `"o": "plone.app.querystring.operation.string.contains",`  
      `"v": "<search_term>"`  
    `},`  
    `{`  
      `"i": "portal_type",`  
      `"o": "plone.app.querystring.operation.selection.any",`  
      `"v": ["Document", "News Item"]`  
    `},`  
    `{`  
      `"i": "review_state",`  
      `"o": "plone.app.querystring.operation.selection.any",`  
      `"v": ["published"]`  
    `}`  
  `],`  
  `"sort_on": "Date",`  
  `"sort_order": "reverse",`  
  `"b_size": 10`  
`}`

**API Calls Used:**

* `GET /@search` \- Simple search queries[\[2\]](#bookmark=id.cijiahpcd64d)[\[4\]](#bookmark=id.eplondmujsb7)

* `POST /@querystring-search` \- Complex filtered queries[\[2\]](#bookmark=id.cijiahpcd64d)

* Returns: `@id`, `title`, `description`, `UID`, `portal_type`, `review_state`, `path`, `modified`, `created`[\[5\]](#bookmark=id.3xvzeqdwp4ma)

**2\. Get Full Content Object**

**Tool Name:** `get_content_by_path`

**Description:** Retrieve complete content object with all fields, text, metadata, and expandable components. Follows the LangChain pattern of returning full structured pages rather than fragments[\[1\]](#bookmark=id.juio3npnilbl).

**Parameters:**

* `path` (string, required): Full path to content (e.g., `/plone/documentation/tutorial`)

* `expand` (array, optional): Components to expand (breadcrumbs, navigation, workflow, actions, types)[\[6\]](#bookmark=id.6tb7mvlmgb4r)[\[7\]](#bookmark=id.jx8dq4tep4yg)

**Plone REST API Implementation:**

`# Get full content with expansions`  
`GET /plone/path/to/content?expand=breadcrumbs,workflow,navigation`

`# Alternative: Get by UID`  
`GET /plone/@content?UID=<uid>`

**API Calls Used:**

* `GET /<content-path>` with `Accept: application/json`[\[1\]](#bookmark=id.juio3npnilbl)[\[8\]](#bookmark=id.g4ba0fkj0y5h)

* Expansion parameters: `?expand=breadcrumbs,workflow,navigation,actions`[\[6\]](#bookmark=id.6tb7mvlmgb4r)[\[7\]](#bookmark=id.jx8dq4tep4yg)

* Returns: All content fields, text/richtext, metadata, parent info, related items, locks[\[6\]](#bookmark=id.6tb7mvlmgb4r)

**3\. Scan Content Titles**

**Tool Name:** `scan_content_titles`

**Description:** Lightweight scan of content titles and descriptions only (no full content). Mirrors LangChain's knowledge base pattern: scan titles first, then read selected items[\[1\]](#bookmark=id.juio3npnilbl).

**Parameters:**

* `path` (string, optional): Folder path to scan

* `portal_type` (array, optional): Filter by content types

* `depth` (integer, optional, default=1): How deep to scan hierarchy

* `limit` (integer, optional, default=50): Maximum items to return

* `sort_on` (string, optional): Sort field

**Plone REST API Implementation:**

`# Scan titles in a folder`  
`GET /plone/documentation/@search?path.query=/plone/documentation&path.depth=1&b_size=50&metadata_fields=title,description,id,portal_type,review_state`

`# Get folder contents (alternative)`  
`GET /plone/documentation?fullobjects=false`

**API Calls Used:**

* `GET /@search` with path constraints and minimal metadata[\[2\]](#bookmark=id.cijiahpcd64d)[\[4\]](#bookmark=id.eplondmujsb7)

* `metadata_fields` parameter to limit returned data

* Returns: Lightweight brain objects with titles, descriptions, IDs, paths[\[5\]](#bookmark=id.3xvzeqdwp4ma)

**4\. Navigate Site Structure**

**Tool Name:** `get_navigation_tree`

**Description:** Get hierarchical navigation tree from any point in the site. Essential for understanding content organization and relationships.

**Parameters:**

* `root_path` (string, optional): Starting point for navigation tree (defaults to portal root)

* `depth` (integer, optional, default=2): How deep to traverse

* `expand_all_items` (boolean, optional, default=false): Include all items or just navigation items

**Plone REST API Implementation:**

`# Get navigation tree with depth`  
`GET /plone/@navigation?expand.navigation.depth=3`

`# Get full navigation tree from specific path`  
`GET /plone/documentation/@navigation?expand.navigation.depth=4`

`# Alternative: use @navigationtree endpoint (if collective.restapi.navigationtree installed)`  
`GET /plone/@navigationtree`

**API Calls Used:**

* `GET /@navigation` with `expand.navigation.depth` parameter[\[9\]](#bookmark=id.eai10dhon71v)[\[10\]](#bookmark=id.qch5iogti0nb)

* Returns: Hierarchical structure with `@id`, `title`, `description`, `items[]` nested[\[9\]](#bookmark=id.eai10dhon71v)

* Alternative: `GET /@navigationtree` for full tree[\[11\]](#bookmark=id.gfk4xl8bosdv)

**5\. Get Breadcrumb Trail**

**Tool Name:** `get_breadcrumbs`

**Description:** Get breadcrumb navigation path for a content item, showing hierarchical location in site.

**Parameters:**

* `path` (string, required): Path to content item

**Plone REST API Implementation:**

`# Get breadcrumbs for specific content`  
`GET /plone/documentation/tutorial/@breadcrumbs`

`# Or expand breadcrumbs with content request`  
`GET /plone/documentation/tutorial?expand=breadcrumbs`

**API Calls Used:**

* `GET /<path>/@breadcrumbs`[\[12\]](#bookmark=id.93aq4jljx6og)[\[13\]](#bookmark=id.26c8nkiiqof9)

* Expansion: `?expand=breadcrumbs` in content requests[\[6\]](#bookmark=id.6tb7mvlmgb4r)

* Returns: `items[]` with `@id` and `title` for each ancestor, plus `root`[\[12\]](#bookmark=id.93aq4jljx6og)

**6\. Get Content Type Schema**

**Tool Name:** `get_content_type_schema`

**Description:** Retrieve the JSON Schema for a specific Plone content type, including all fields, behaviors, and fieldsets.

**Parameters:**

* `type_id` (string, required): Content type ID (e.g., "Document", "News Item", "Event")

**Plone REST API Implementation:**

`# Get schema for a content type`  
`GET /plone/@types/Document`

`# List all available content types`  
`GET /plone/@types`

**API Calls Used:**

* `GET /@types/<type_id>` for specific type schema[\[14\]](#bookmark=id.oxx5a4lve3as)

* `GET /@types` for listing all types[\[14\]](#bookmark=id.oxx5a4lve3as)

* Returns: JSON Schema with `fieldsets[]`, `properties{}`, `required[]`, `layouts[]`, behaviors[\[14\]](#bookmark=id.oxx5a4lve3as)

**7\. Search by Metadata/Tags**

**Tool Name:** `search_by_metadata`

**Description:** Search and filter content by metadata fields like tags (Subject), creators, dates, location in hierarchy.

**Parameters:**

* `subjects` (array, optional): Tags/keywords to match

* `creators` (array, optional): Filter by content creators

* `portal_type` (array, optional): Content types

* `created_start` (string, optional): ISO date

* `created_end` (string, optional): ISO date

* `modified_start` (string, optional): ISO date

* `path` (string, optional): Location path

**Plone REST API Implementation:**

`# Search by subject/tags`  
`POST /plone/@querystring-search`  
`{`  
  `"query": [`  
    `{`  
      `"i": "Subject",`  
      `"o": "plone.app.querystring.operation.selection.any",`  
      `"v": ["tutorial", "documentation"]`  
    `},`  
    `{`  
      `"i": "Creator",`  
      `"o": "plone.app.querystring.operation.selection.any",`  
      `"v": ["admin"]`  
    `}`  
  `]`  
`}`

`# Simple search with metadata`  
`GET /plone/@search?Subject=tutorial&Creator=admin`

**API Calls Used:**

* `POST /@querystring-search` for complex metadata queries[\[2\]](#bookmark=id.cijiahpcd64d)[\[15\]](#bookmark=id.vsbpufztx0x)

* `GET /@search` with metadata field parameters[\[2\]](#bookmark=id.cijiahpcd64d)[\[4\]](#bookmark=id.eplondmujsb7)

* Queryable fields: `Subject`, `Creator`, `created`, `modified`, `effective`, `expires`, `path`[\[15\]](#bookmark=id.vsbpufztx0x)

**8\. Get Workflow State and History**

**Tool Name:** `get_workflow_info`

**Description:** Get current workflow state, available transitions, and workflow history for content items.

**Parameters:**

* `path` (string, required): Path to content item

* `include_history` (boolean, optional, default=true): Include full workflow history

**Plone REST API Implementation:**

`# Get workflow state and transitions`  
`GET /plone/document/@workflow`

`# Expand workflow with content`  
`GET /plone/document?expand=workflow`

**API Calls Used:**

* `GET /<path>/@workflow`[\[16\]](#bookmark=id.3aupe1x6n02b)

* Expansion: `?expand=workflow`[\[6\]](#bookmark=id.6tb7mvlmgb4r)[\[7\]](#bookmark=id.jx8dq4tep4yg)

* Returns: `state{}` (id, title), `transitions[]` (available actions), `history[]` (past transitions)[\[16\]](#bookmark=id.3aupe1x6n02b)

**9\. Get Version History**

**Tool Name:** `get_version_history`

**Description:** Retrieve version history for versioned content, showing all edits and changes over time.

**Parameters:**

* `path` (string, required): Path to content item

* `include_versions` (boolean, optional, default=true): Include full version details

**Plone REST API Implementation:**

`# Get complete history (workflow + versions)`  
`GET /plone/front-page/@history`

`# Get specific version`  
`GET /plone/front-page/@history/0`

**API Calls Used:**

* `GET /<path>/@history`[\[17\]](#bookmark=id.26jsw2gjnuqf)[\[18\]](#bookmark=id.gaos5k48c4b1)

* Returns: Array of changes with `action`, `actor`, `comments`, `time`, `version`, `type` (versioning/workflow)[\[17\]](#bookmark=id.26jsw2gjnuqf)

* Each version has `@id` for retrieval and `may_revert` permission flag[\[17\]](#bookmark=id.26jsw2gjnuqf)

**10\. List Folder Contents**

**Tool Name:** `list_folder_contents`

**Description:** List immediate children of a folder with metadata. Useful for exploring content organization.

**Parameters:**

* `path` (string, required): Folder path

* `fullobjects` (boolean, optional, default=false): Return full objects or just summaries

* `sort_on` (string, optional): Sort field

* `sort_order` (string, optional): "ascending" or "descending"

**Plone REST API Implementation:**

`# List folder contents (summary)`  
`GET /plone/documentation?fullobjects=false`

`# Get full objects`  
`GET /plone/documentation?fullobjects=true`

`# With sorting`  
`GET /plone/documentation?sort_on=modified&sort_order=descending`

**API Calls Used:**

* `GET /<folder-path>` returns `items[]` with folder contents[\[5\]](#bookmark=id.3xvzeqdwp4ma)

* Parameter `fullobjects=false` returns summaries; `fullobjects=true` returns complete objects[\[8\]](#bookmark=id.g4ba0fkj0y5h)

* Each item includes: `@id`, `@type`, `title`, `description`, `review_state`[\[5\]](#bookmark=id.3xvzeqdwp4ma)

**11\. Get Comments/Discussion**

**Tool Name:** `get_content_comments`

**Description:** Retrieve all comments and discussion threads for a content item (if discussion is enabled).

**Parameters:**

* `path` (string, required): Path to content item

* `limit` (integer, optional): Maximum comments to return

**Plone REST API Implementation:**

`# Get all comments for content`  
`GET /plone/front-page/@comments`

`# With batching`  
`GET /plone/front-page/@comments?b_size=25&b_start=0`

**API Calls Used:**

* `GET /<path>/@comments`[\[19\]](#bookmark=id.yg6emk2rf8z9)[\[20\]](#bookmark=id.1wzx13kzzcro)

* Returns: `items[]` with comment objects containing `@id`, `comment_id`, `author_name`, `text`, `creation_date`, `in_reply_to`[\[20\]](#bookmark=id.1wzx13kzzcro)

* Supports batching for large comment threads[\[20\]](#bookmark=id.1wzx13kzzcro)

**12\. Refine Search Query**

**Tool Name:** `refine_search`

**Description:** Perform a follow-up search with refined/narrowed parameters based on initial results. Implements the iterative refinement pattern from LangChain[\[1\]](#bookmark=id.juio3npnilbl).

**Parameters:**

* `original_query` (string, required): Original search term

* `refined_query` (string, required): More specific search term

* `additional_filters` (object, optional): Extra constraints (portal\_type, path, dates)

* `exclude_paths` (array, optional): Paths to exclude from results

**Plone REST API Implementation:**

`# Refined search with multiple criteria`  
`POST /plone/@querystring-search`  
`{`  
  `"query": [`  
    `{`  
      `"i": "SearchableText",`  
      `"o": "plone.app.querystring.operation.string.contains",`  
      `"v": "<refined_query>"`  
    `},`  
    `{`  
      `"i": "path",`  
      `"o": "plone.app.querystring.operation.string.path",`  
      `"v": "/plone/documentation"  # Narrow to specific section`  
    `},`  
    `{`  
      `"i": "portal_type",`  
      `"o": "plone.app.querystring.operation.selection.any",`  
      `"v": ["Document"]  # Narrow to specific type`  
    `}`  
  `]`  
`}`

**API Calls Used:**

* `POST /@querystring-search` with refined query operators[\[2\]](#bookmark=id.cijiahpcd64d)[\[15\]](#bookmark=id.vsbpufztx0x)

* Use path operations to narrow scope[\[15\]](#bookmark=id.vsbpufztx0x)

* Combine multiple `SearchableText` or specific field queries[\[2\]](#bookmark=id.cijiahpcd64d)

**13\. Get Related Content**

**Tool Name:** `get_related_items`

**Description:** Retrieve content items that are explicitly related to a given content object through the relatedItems field.

**Parameters:**

* `path` (string, required): Path to content item

**Plone REST API Implementation:**

`# Get content with related items`  
`GET /plone/document`

`# Related items are in the relatedItems field as references`  
`# Each related item has @id which can be fetched separately`

**API Calls Used:**

* `GET /<path>` returns content with `relatedItems[]` array[\[6\]](#bookmark=id.6tb7mvlmgb4r)

* Each related item includes `@id`, `title`, and can be fetched separately

* Use `?expand=` mechanism if custom expansion for related items is available[\[6\]](#bookmark=id.6tb7mvlmgb4r)

**14\. Search by Content Path/Location**

**Tool Name:** `search_by_location`

**Description:** Search for content within a specific section of the site hierarchy, with control over depth.

**Parameters:**

* `root_path` (string, required): Starting path for search

* `depth` (integer, optional): How many levels deep to search (-1 for unlimited)

* `include_subfolders` (boolean, optional, default=true): Include nested folders

**Plone REST API Implementation:**

`# Search within specific path with depth`  
`GET /plone/@search?path.query=/plone/documentation&path.depth=2`

`# Search in path and all subfolders (no depth limit)`  
`GET /plone/@search?path.query=/plone/documentation`

`# Use querystring for more control`  
`POST /plone/@querystring-search`  
`{`  
  `"query": [`  
    `{`  
      `"i": "path",`  
      `"o": "plone.app.querystring.operation.string.path",`  
      `"v": "/plone/documentation"`  
    `}`  
  `]`  
`}`

**API Calls Used:**

* `GET /@search` with `path.query` and `path.depth` parameters[\[2\]](#bookmark=id.cijiahpcd64d)[\[15\]](#bookmark=id.vsbpufztx0x)

* Path operations: `absolutePath`, `path`, `relativePath`[\[15\]](#bookmark=id.vsbpufztx0x)

* Returns: All content matching path constraints[\[2\]](#bookmark=id.cijiahpcd64d)

**15\. Get Site Configuration Info**

**Tool Name:** `get_site_info`

**Description:** Get information about the Plone site root, available content types, and general configuration.

**Parameters:**

* None (operates on site root)

**Plone REST API Implementation:**

`# Get site root info`  
`GET /plone/`

`# Get all available content types`  
`GET /plone/@types`

`# Get available queryable indexes`  
`GET /plone/@querystring`

**API Calls Used:**

* `GET /plone/` returns site root with basic info[\[5\]](#bookmark=id.3xvzeqdwp4ma)

* `GET /@types` lists all content types and schemas[\[14\]](#bookmark=id.oxx5a4lve3as)

* `GET /@querystring` returns available search indexes and operations[\[15\]](#bookmark=id.vsbpufztx0x)

**Implementation Strategy**

**Tool Organization Pattern**

Following LangChain's approach[\[1\]](#bookmark=id.juio3npnilbl), organize tools into **logical groups** that the agent can use strategically:

**1\. Discovery Tools** (scan before reading):

* `scan_content_titles` \- Quick title scans

* `get_navigation_tree` \- Structure overview

* `search_by_metadata` \- Tag-based discovery

**2\. Retrieval Tools** (get full content):

* `get_content_by_path` \- Full content retrieval

* `search_plone_content` \- Full-text search

* `list_folder_contents` \- Folder exploration

**3\. Context Tools** (understand relationships):

* `get_breadcrumbs` \- Location context

* `get_related_items` \- Related content

* `get_workflow_info` \- State and permissions

**4\. Refinement Tools** (iterative improvement):

* `refine_search` \- Narrow results

* `search_by_location` \- Path-constrained search

* `get_content_type_schema` \- Type-specific queries

**Prompting Strategy**

Teach the agent to[\[1\]](#bookmark=id.juio3npnilbl):

1. **Start broad**: Use `scan_content_titles` or `search_plone_content` with general terms

2. **Evaluate results**: Check if answers are sufficient or need refinement

3. **Refine iteratively**: Use `refine_search` or path-constrained searches to narrow

4. **Get full context**: Retrieve complete content with `get_content_by_path` including expansions

5. **Budget 4-6 tool calls** per query for optimal balance of thoroughness and speed

**Advantages Over Vector Embeddings**

Following LangChain's findings[\[1\]](#bookmark=id.juio3npnilbl), direct API access provides:

* **No chunking**: Content structure and context preserved

* **No reindexing**: Changes reflected immediately through Plone's catalog

* **Precise citations**: Exact `@id` URLs for every result

* **Rich metadata**: Full workflow, versioning, and relationship data

* **Hierarchical context**: Breadcrumbs and navigation structure maintained

**Technical Implementation Notes**

**Authentication**

All Plone REST API calls require authentication[\[21\]](#bookmark=id.7o08x2x4f4n):

`# Basic authentication header`  
`Authorization: Basic <base64(username:password)>`

`# Or use JWT tokens if configured`  
`Authorization: Bearer <jwt_token>`

**Content Negotiation**

Use `Accept: application/json` header or `++api++` traversal[\[3\]](#bookmark=id.dts2h22p9t97):

`# With header`  
`GET /plone/document`  
`Accept: application/json`

`# With traversal`  
`GET /plone/++api++/document`

**Error Handling**

Handle common Plone REST API responses:

* `200 OK` \- Success

* `404 Not Found` \- Content doesn't exist

* `401 Unauthorized` \- Authentication required

* `403 Forbidden` \- Permission denied

**Batching**

For large result sets, use batching parameters[\[2\]](#bookmark=id.cijiahpcd64d):

`GET /plone/@search?SearchableText=query&b_size=25&b_start=0`

Returns: `batching` object with `@id`, `first`, `last`, `prev`, `next` links

**Performance Optimization**

* Use `metadata_fields` to limit returned data for scans

* Leverage `expand` parameter to avoid multiple requests[\[6\]](#bookmark=id.6tb7mvlmgb4r)

* Cache frequently accessed schemas and navigation trees

* Set appropriate `page_size`/`b_size` limits

**Summary**

This MCP server design for Plone follows proven patterns from LangChain's production system[\[1\]](#bookmark=id.juio3npnilbl):

✅ **Full content retrieval** instead of fragmented chunks  
✅ **Scan-then-read pattern** for efficient discovery  
✅ **Iterative refinement** with 4-6 tool call budget  
✅ **Direct API access** leveraging Plone's native search capabilities  
✅ **Rich metadata exposure** for context-aware responses  
✅ **Hierarchical navigation** for structural understanding

The 15 tools cover all essential knowledge base operations: search, navigation, metadata queries, versioning, discussions, and structural exploration. Each tool maps directly to well-documented Plone REST API endpoints[\[1\]](#bookmark=id.juio3npnilbl)[\[2\]](#bookmark=id.cijiahpcd64d)[\[3\]](#bookmark=id.dts2h22p9t97)[\[6\]](#bookmark=id.6tb7mvlmgb4r), ensuring reliable implementation and maintenance.

⁂

1. [https://plonerestapi.readthedocs.io](https://plonerestapi.readthedocs.io)             

2. [https://plonerestapi.readthedocs.io/en/latest/endpoints/querystringsearch.html](https://plonerestapi.readthedocs.io/en/latest/endpoints/querystringsearch.html)            

3. [https://2023.training.plone.org/effective-volto/backend/plone-restapi-endpoints.html](https://2023.training.plone.org/effective-volto/backend/plone-restapi-endpoints.html)   

4. [https://plonerestapi.readthedocs.io/en/latest/endpoints/searching.html](https://plonerestapi.readthedocs.io/en/latest/endpoints/searching.html)   

5. [https://2022.training.plone.org/gatsby/plonerestapi.html](https://2022.training.plone.org/gatsby/plonerestapi.html)     

6. [https://plonerestapi.readthedocs.io/en/latest/usage/expansion.html](https://plonerestapi.readthedocs.io/en/latest/usage/expansion.html)         

7. [https://6.docs.plone.org/plone.restapi/docs/source/usage/expansion.html](https://6.docs.plone.org/plone.restapi/docs/source/usage/expansion.html)   

8. [https://6.docs.plone.org/plone.restapi/docs/source/usage/content.html](https://6.docs.plone.org/plone.restapi/docs/source/usage/content.html)  

9. [https://plonerestapi.readthedocs.io/en/latest/endpoints/navigation.html](https://plonerestapi.readthedocs.io/en/latest/endpoints/navigation.html)  

10. [https://6.docs.plone.org/plone.restapi/docs/source/endpoints/navigation.html](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/navigation.html) 

11. [https://pypi.org/project/collective.restapi.navigationtree/](https://pypi.org/project/collective.restapi.navigationtree/) 

12. [https://6.docs.plone.org/plone.restapi/docs/source/endpoints/breadcrumbs.html](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/breadcrumbs.html)  

13. [https://plonerestapi.readthedocs.io/en/latest/endpoints/breadcrumbs.html](https://plonerestapi.readthedocs.io/en/latest/endpoints/breadcrumbs.html) 

14. [https://plonerestapi.readthedocs.io/en/latest/endpoints/types.html](https://plonerestapi.readthedocs.io/en/latest/endpoints/types.html)    

15. [https://plonerestapi.readthedocs.io/en/latest/endpoints/querystring.html](https://plonerestapi.readthedocs.io/en/latest/endpoints/querystring.html)       

16. [https://plonerestapi.readthedocs.io/en/latest/endpoints/workflow.html](https://plonerestapi.readthedocs.io/en/latest/endpoints/workflow.html)  

17. [https://6.docs.plone.org/plone.restapi/docs/source/endpoints/history.html](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/history.html)   

18. [https://6.docs.plone.org/volto/client/actions/history.html](https://6.docs.plone.org/volto/client/actions/history.html) 

19. [https://6.docs.plone.org/volto/client/actions/comments.html](https://6.docs.plone.org/volto/client/actions/comments.html) 

20. [https://plonerestapi.readthedocs.io/en/latest/endpoints/comments.html](https://plonerestapi.readthedocs.io/en/latest/endpoints/comments.html)   

21. [https://plonerestapi.readthedocs.io/en/latest/usage/authentication.html](https://plonerestapi.readthedocs.io/en/latest/usage/authentication.html) 

22. [https://modelcontextprotocol.io/specification/2025-06-18/server/tools](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) 

23. [https://github.com/plone/plone.rest](https://github.com/plone/plone.rest) 

24. [https://strandsagents.com/latest/documentation/docs/user-guide/concepts/tools/mcp-tools/](https://strandsagents.com/latest/documentation/docs/user-guide/concepts/tools/mcp-tools/) 

25. [https://6.docs.plone.org/plone.api/content.html](https://6.docs.plone.org/plone.api/content.html) 

26. [https://6.docs.plone.org/volto/backend/index.html](https://6.docs.plone.org/volto/backend/index.html) 

27. [https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-components-to-agent](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-components-to-agent) 

28. [https://4.docs.plone.org/external/plone.api/docs/content.html](https://4.docs.plone.org/external/plone.api/docs/content.html) 

29. [https://pypi.org/project/plone.restapi/](https://pypi.org/project/plone.restapi/) 

30. [https://github.com/modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) 

31. [https://pythonhosted.org/xmldirector.plonecore/api.html](https://pythonhosted.org/xmldirector.plonecore/api.html) 

32. [https://docs.langchain.com/oss/python/langchain/mcp](https://docs.langchain.com/oss/python/langchain/mcp) 

33. [https://6.docs.plone.org/plone.api/api/content.html](https://6.docs.plone.org/plone.api/api/content.html) 

34. [https://www.youtube.com/watch?v=0ws-vzoTDdw](https://www.youtube.com/watch?v=0ws-vzoTDdw) 

35. [https://modelcontextprotocol.info/docs/concepts/tools/](https://modelcontextprotocol.info/docs/concepts/tools/) 

36. [https://stackoverflow.com/questions/41875073/when-i-use-plone-api-content-create-in-for-find-results-ever-empty](https://stackoverflow.com/questions/41875073/when-i-use-plone-api-content-create-in-for-find-results-ever-empty) 

37. [https://6.docs.plone.org/plone.api/index.html](https://6.docs.plone.org/plone.api/index.html) 

38. [https://modelcontextprotocol.io](https://modelcontextprotocol.io) 

39. [https://community.plone.org/t/setting-review-state-quick-programmatically/12991](https://community.plone.org/t/setting-review-state-quick-programmatically/12991) 

40. [https://2023.training.plone.org/workflow/introduction.html](https://2023.training.plone.org/workflow/introduction.html) 

41. [https://6.docs.plone.org/plone.restapi/docs/source/endpoints/index.html](https://6.docs.plone.org/plone.restapi/docs/source/endpoints/index.html) 

42. [https://plonerestapi.readthedocs.io/en/latest/endpoints/index.html](https://plonerestapi.readthedocs.io/en/latest/endpoints/index.html) 

43. [https://6.docs.plone.org/plone.api/api/index.html](https://6.docs.plone.org/plone.api/api/index.html) 

44. [https://2022.training.plone.org/mastering-plone/endpoints.html](https://2022.training.plone.org/mastering-plone/endpoints.html) 

45. [https://4.docs.plone.org/external/plone.app.dexterity/docs/advanced/workflow.html](https://4.docs.plone.org/external/plone.app.dexterity/docs/advanced/workflow.html) 

46. [https://stackoverflow.com/questions/39394432/plone-workflow-is-it-possible-to-set-the-state-of-a-workflow-without-needing-a](https://stackoverflow.com/questions/39394432/plone-workflow-is-it-possible-to-set-the-state-of-a-workflow-without-needing-a) 

47. [https://kitconcept.com/en/blog/headless-and-mobile-the-future-of-plone](https://kitconcept.com/en/blog/headless-and-mobile-the-future-of-plone) 

48. [https://6.docs.plone.org/plone.api/api/user.html](https://6.docs.plone.org/plone.api/api/user.html) 

49. [https://4.docs.plone.org/develop/plone/misc/navigationtree.html](https://4.docs.plone.org/develop/plone/misc/navigationtree.html) 

50. [https://6.docs.plone.org/backend/content-types/index.html](https://6.docs.plone.org/backend/content-types/index.html) 

51. [https://2023.training.plone.org/workflow/roles-and-permissions.html](https://2023.training.plone.org/workflow/roles-and-permissions.html) 

52. [https://5.docs.plone.org/develop/plone/misc/navigationtree.html](https://5.docs.plone.org/develop/plone/misc/navigationtree.html) 

53. [https://training.plone.org/mastering-plone/dexterity.html](https://training.plone.org/mastering-plone/dexterity.html) 

54. [https://github.com/plone/plone.app.contenttypes](https://github.com/plone/plone.app.contenttypes) 

55. [https://4.docs.plone.org/external/plone.api/docs/user.html](https://4.docs.plone.org/external/plone.api/docs/user.html) 

56. [https://plonerestapi.readthedocs.io/en/latest/usage/types-schema.html](https://plonerestapi.readthedocs.io/en/latest/usage/types-schema.html) 

57. [https://plonerestapi.readthedocs.io/en/latest/endpoints/sharing.html](https://plonerestapi.readthedocs.io/en/latest/endpoints/sharing.html) 

58. [https://stackoverflow.com/questions/13689365/plone-shown-default-views-on-navtree](https://stackoverflow.com/questions/13689365/plone-shown-default-views-on-navtree) 

59. [https://pypi.org/project/plone.app.contenttypes/](https://pypi.org/project/plone.app.contenttypes/) 

60. [https://github.com/plone/plone.api/issues/293](https://github.com/plone/plone.api/issues/293) 

61. [https://av.tib.eu/media/54791](https://av.tib.eu/media/54791) 

62. [https://5.docs.plone.org/external/plone.app.dexterity/docs/advanced/catalog-indexing-strategies.html](https://5.docs.plone.org/external/plone.app.dexterity/docs/advanced/catalog-indexing-strategies.html) 

63. [https://5.docs.plone.org/working-with-content/portlet-management/portlet-hierarchy.html](https://5.docs.plone.org/working-with-content/portlet-management/portlet-hierarchy.html) 

64. [https://4.docs.plone.org/external/plone.app.dexterity/docs/advanced/catalog-indexing-strategies.html](https://4.docs.plone.org/external/plone.app.dexterity/docs/advanced/catalog-indexing-strategies.html) 

65. [https://p8501onewebst.z6.web.core.windows.net/docs/80.3.0/one/list-zone-hierarchies](https://p8501onewebst.z6.web.core.windows.net/docs/80.3.0/one/list-zone-hierarchies) 

66. [https://github.com/collective/collective.elasticsearch](https://github.com/collective/collective.elasticsearch) 

67. [https://stackoverflow.com/questions/7114416/is-there-a-way-to-do-a-portal-catalog-that-keeps-the-hierarchical-structure](https://stackoverflow.com/questions/7114416/is-there-a-way-to-do-a-portal-catalog-that-keeps-the-hierarchical-structure) 

68. [https://3.docs.plone.org/develop/plone/content/history.html](https://3.docs.plone.org/develop/plone/content/history.html) 

69. [https://stackoverflow.com/questions/16825275/how-to-set-the-value-of-the-catalogs-index-searchabletext-for-an-object](https://stackoverflow.com/questions/16825275/how-to-set-the-value-of-the-catalogs-index-searchabletext-for-an-object) 

70. [https://plonerestapi.readthedocs.io/en/latest/endpoints/inherit.html](https://plonerestapi.readthedocs.io/en/latest/endpoints/inherit.html) 

71. [https://stackoverflow.com/questions/10084684/show-the-user-who-made-the-last-modification-on-a-document-in-plone](https://stackoverflow.com/questions/10084684/show-the-user-who-made-the-last-modification-on-a-document-in-plone) 

72. [https://community.plone.org/t/best-practices-on-categorization/12462](https://community.plone.org/t/best-practices-on-categorization/12462) 

73. [https://engineering.purdue.edu/ECN/Support/KB/Docs/ZopeBook/SearchingZCatalog.whtml](https://engineering.purdue.edu/ECN/Support/KB/Docs/ZopeBook/SearchingZCatalog.whtml) 

74. [https://github.com/plone/Products.CMFEditions](https://github.com/plone/Products.CMFEditions) 

75. [https://app.readthedocs.org/projects/collectiveelasticsearch/downloads/epub/stable/](https://app.readthedocs.org/projects/collectiveelasticsearch/downloads/epub/stable/) 

76. [https://gitea.iwm-tuebingen.de/ajung/plone.app.discussion/raw/commit/198225ae9a8fe6b9687f1560fc03b5b94457fc68/docs/source/api.txt](https://gitea.iwm-tuebingen.de/ajung/plone.app.discussion/raw/commit/198225ae9a8fe6b9687f1560fc03b5b94457fc68/docs/source/api.txt) 

77. [https://plonerestapi.readthedocs.io/en/latest/endpoints/controlpanels.html](https://plonerestapi.readthedocs.io/en/latest/endpoints/controlpanels.html) 

78. [https://cleartax.in/ai/posts/mcp-integration-patterns](https://cleartax.in/ai/posts/mcp-integration-patterns) 

79. [https://stackoverflow.com/questions/7654855/plone-4-how-to-retrieve-the-item-category-tags-keywords-inside-a-page-template](https://stackoverflow.com/questions/7654855/plone-4-how-to-retrieve-the-item-category-tags-keywords-inside-a-page-template) 

80. [https://a16z.com/a-deep-dive-into-mcp-and-the-future-of-ai-tooling/](https://a16z.com/a-deep-dive-into-mcp-and-the-future-of-ai-tooling/) 

81. [https://pypi.org/project/plone.app.discussion/](https://pypi.org/project/plone.app.discussion/) 

82. [https://5.docs.plone.org/develop/plone/searching\_and\_indexing/indexing.html](https://5.docs.plone.org/develop/plone/searching_and_indexing/indexing.html) 

83. [https://code.visualstudio.com/docs/copilot/customization/mcp-servers](https://code.visualstudio.com/docs/copilot/customization/mcp-servers) 

84. [https://3.docs.plone.org/develop/plone/functionality/discussion.html](https://3.docs.plone.org/develop/plone/functionality/discussion.html) 

85. [https://github.com/plone/plone.app.vocabularies](https://github.com/plone/plone.app.vocabularies) 

86. [https://google.github.io/adk-docs/tools/mcp-tools/](https://google.github.io/adk-docs/tools/mcp-tools/) 

87. [https://pythonhosted.org/plone.app.discussion/api.html](https://pythonhosted.org/plone.app.discussion/api.html) 

88. [https://5.docs.plone.org/develop/plone/searching\_and\_indexing/query.html](https://5.docs.plone.org/develop/plone/searching_and_indexing/query.html) 

89. [https://ainativedev.io/news/teaching-mcp-servers-new-tricks](https://ainativedev.io/news/teaching-mcp-servers-new-tricks) 

90. [https://github.com/plone/plone.api](https://github.com/plone/plone.api) 

[image1]: <data:image/png;base64,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>
# Missing Tools Specifications for Plone MCP Server

This document contains specifications for tools that are described in the MCP Server Tools for Plone CMS Knowledge Base Agent specification but are not currently implemented in the Plone MCP server.

## 1. get_navigation_tree

**Tool Name:** `get_navigation_tree`

**Description:** Get hierarchical navigation tree from any point in the site. Essential for understanding content organization and relationships.

**Parameters:**
- `root_path` (string, optional): Starting point for navigation tree (defaults to portal root)
- `depth` (integer, optional, default=2): How deep to traverse

**Example Usage:**
```
get_navigation_tree({root_path: '/documentation', depth: 3})
```

**Plone REST API Implementation:**
- `GET /@navigation` with `expand.navigation.depth` parameter
- Returns: Hierarchical structure with `@id`, `title`, `description`, `items[]` nested

## 2. get_breadcrumbs

**Tool Name:** `get_breadcrumbs`

**Description:** Get breadcrumb navigation path for a content item, showing hierarchical location in site.

**Parameters:**
- `path` (string, required): Path to content item

**Example Usage:**
```
get_breadcrumbs({path: '/documentation/tutorial'})
```

**Plone REST API Implementation:**
- `GET /<path>/@breadcrumbs`
- Alternative: `?expand=breadcrumbs` in content requests
- Returns: `items[]` with `@id` and `title` for each ancestor, plus `root`

## 3. get_content_type_schema

**Tool Name:** `get_content_type_schema`

**Description:** Retrieve the JSON Schema for a specific Plone content type, including all fields, behaviors, and fieldsets.

**Parameters:**
- `type_id` (string, required): Content type ID (e.g., "Document", "News Item", "Event")

**Example Usage:**
```
get_content_type_schema({type_id: 'Document'})
```

**Plone REST API Implementation:**
- `GET /@types/<type_id>` for specific type schema
- `GET /@types` for listing all types
- Returns: JSON Schema with `fieldsets[]`, `properties{}`, `required[]`, `layouts[]`, behaviors

## 4. search_by_metadata

**Tool Name:** `search_by_metadata`

**Description:** Search and filter content by metadata fields like tags (Subject), creators, dates, location in hierarchy.

**Parameters:**
- `subjects` (array, optional): Tags/keywords to match
- `creators` (array, optional): Filter by content creators
- `portal_type` (array, optional): Content types
- `created_start` (string, optional): ISO date
- `created_end` (string, optional): ISO date
- `modified_start` (string, optional): ISO date
- `modified_end` (string, optional): ISO date
- `path` (string, optional): Location path

**Example Usage:**
```
search_by_metadata({subjects: ['tutorial', 'documentation'], creators: ['admin']})
```

**Plone REST API Implementation:**
- `POST /@querystring-search` for complex metadata queries
- `GET /@search` with metadata field parameters
- Queryable fields: `Subject`, `Creator`, `created`, `modified`, `effective`, `expires`, `path`

## 5. get_version_history

**Tool Name:** `get_version_history`

**Description:** Retrieve version history for versioned content, showing all edits and changes over time.

**Parameters:**
- `path` (string, required): Path to content item

**Example Usage:**
```
get_version_history({path: '/front-page'})
```

**Plone REST API Implementation:**
- `GET /<path>/@history`
- Returns: Array of changes with `action`, `actor`, `comments`, `time`, `version`, `type` (versioning/workflow)
- Each version has `@id` for retrieval and `may_revert` permission flag

## 6. list_folder_contents

**Tool Name:** `list_folder_contents`

**Description:** List immediate children of a folder with metadata. Useful for exploring content organization.

**Parameters:**
- `path` (string, required): Folder path
- `fullobjects` (boolean, optional, default=false): Return full objects or just summaries
- `sort_on` (string, optional): Sort field
- `sort_order` (string, optional): "ascending" or "descending"
- `page_size` (integer, optional, default=20): Number of results to return

**Example Usage:**
```
list_folder_contents({path: '/documentation', fullobjects: false, sort_on: 'title'})
```

**Plone REST API Implementation:**
- `GET /<folder-path>` returns `items[]` with folder contents
- Parameter `fullobjects=false` returns summaries; `fullobjects=true` returns complete objects
- Each item includes: `@id`, `@type`, `title`, `description`, `review_state`

## 7. get_content_comments

**Tool Name:** `get_content_comments`

**Description:** Retrieve all comments and discussion threads for a content item (if discussion is enabled).

**Parameters:**
- `path` (string, required): Path to content item
- `limit` (integer, optional): Maximum comments to return (maps to `b_size`)
- `offset` (integer, optional): Offset for pagination (maps to `b_start`)

**Example Usage:**
```
get_content_comments({path: '/front-page', limit: 25})
```

**Plone REST API Implementation:**
- `GET /<path>/@comments`
- Supports batching with `b_size` and `b_start` for large comment threads
- Returns: `items[]` with comment objects containing `@id`, `comment_id`, `author_name`, `text`, `creation_date`, `in_reply_to`

## 8. refine_search

**Tool Name:** `refine_search`

**Description:** Perform a follow-up search with refined/narrowed parameters based on initial results. Implements the iterative refinement pattern.

**Parameters:**
- `original_query` (string, required): Original search term
- `refined_query` (string, required): More specific search term
- `additional_filters` (object, optional): Extra constraints (portal_type, path, dates)
- `exclude_paths` (array, optional): Paths to exclude from results
- `portal_type` (array, optional): Filter by content types
- `path` (string, optional): Limit search to specific folder path
- `page_size` (integer, optional, default=10): Number of results to return

**Example Usage:**
```
refine_search({
  original_query: "documentation", 
  refined_query: "API documentation", 
  additional_filters: {portal_type: ["Document"]},
  exclude_paths: ["/drafts"]
})
```

**Plone REST API Implementation:**
- `POST /@querystring-search` with refined query operators
- Use path operations to narrow scope
- Combine multiple `SearchableText` or specific field queries

## 9. get_related_items

**Tool Name:** `get_related_items`

**Description:** Retrieve content items that are explicitly related to a given content object through the relatedItems field.

**Parameters:**
- `path` (string, required): Path to content item

**Example Usage:**
```
get_related_items({path: '/document'})
```

**Plone REST API Implementation:**
- `GET /<path>` returns content with `relatedItems[]` array
- Each related item includes `@id`, `title`, and can be fetched separately
- Use `?expand=` mechanism if custom expansion for related items is available

## 10. search_by_location

**Tool Name:** `search_by_location`

**Description:** Search for content within a specific section of the site hierarchy, with control over depth.

**Parameters:**
- `root_path` (string, required): Starting path for search
- `depth` (integer, optional): How many levels deep to search (-1 for unlimited)
- `include_subfolders` (boolean, optional, default=true): Include nested folders
- `portal_type` (array, optional): Filter by content types
- `page_size` (integer, optional, default=10): Number of results to return

**Example Usage:**
```
search_by_location({root_path: '/products', depth: 2, portal_type: ['Document', 'News Item']})
```

**Plone REST API Implementation:**
- `POST /@querystring-search` with a `query` parameter that includes `path` (using operators like `plone.app.querystring.operation.string.path`, `absolutePath`, `relativePath`) and a `depth` value (e.g., `v: '/my-content-object::2'`)
- Returns: All content matching path constraints

## 11. scan_content_titles

**Tool Name:** `scan_content_titles`

**Description:** Lightweight scan of content titles and descriptions only (no full content). Mirrors the pattern of scanning titles first, then reading selected items.

**Parameters:**
- `path` (string, optional): Folder path to scan
- `portal_type` (array, optional): Filter by content types
- `depth` (integer, optional, default=1): How deep to scan hierarchy
- `limit` (integer, optional, default=50): Maximum items to return
- `sort_on` (string, optional): Sort field
- `include_content` (boolean, optional, default=false): Include content or titles only

**Example Usage:**
```
scan_content_titles({path: '/documentation', portal_type: ['Document'], limit: 30})
```

**Plone REST API Implementation:**
- `GET /@search` with path constraints and minimal metadata
- `metadata_fields` parameter to limit returned data
- Returns: Lightweight brain objects with titles, descriptions, IDs, paths
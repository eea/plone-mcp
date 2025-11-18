# XMCP Migration Plan for Plone MCP Server

## 1. Objective and Success Criteria
- **Goal:** Rebuild the Plone MCP server on top of the XMCP framework to gain filesystem-based tool discovery, xmcp CLI ergonomics, middleware support, and first-class transports while preserving every existing capability.
- **Success metrics:** (1) Parity for all 17 Plone tools, 3 prompts, and 3 resources, (2) `xmcp dev` and `xmcp build` produce a working stdio binary that passes current Vitest suites, (3) documentation reflects the new developer workflow, (4) existing consumers can migrate with a one-line command change.
- **Non-goals:** Rewriting Plone-specific business logic, changing public tool signatures, or altering external REST integrations.

## 2. Current State Snapshot
- **Runtime:** Custom `src/index.ts` instantiating `McpServer` from `@modelcontextprotocol/sdk`, manual registration of tools/resources/prompts, direct `StdioServerTransport`.
- **Tool surface:** Configuration (`plone_configure`), CRUD (`plone_*`), search, workflow, navigation, and Volto block operations handled via `PloneToolHandlers`.
- **Shared services:** `PloneClient` handles auth + REST I/O; `block-registry`, markdown parser, and blocks cache logic live under `src/`.
- **Build/Test:** `tsc` → `dist/index.js`, `vitest` suites under `tests/`, Makefile targets (`type-check`, `test`, `format`).
- **Distribution:** npm binary name `plone-mcp-server`, invoked via `node dist/index.js`.

## 3. Target XMCP Architecture
- **Filesystem routing:** Adopt XMCP’s `src/tools`, `src/resources`, and `src/prompts` structure (see `xmcp/examples/stdio-transport`) so each Plone tool becomes its own module exporting `metadata`, `schema`, and handler.
- **Config:** Introduce `xmcp.config.ts` with `stdio: true`, and optionally HTTP transport toggles for future hosting.
- **Shared libraries:** Keep `PloneClient`, block helpers, and markdown parser under `src/lib/` (or similar) and import them from each tool module.
- **Middleware/hooks:** Use XMCP middlewares for connection bootstrap (`plone_configure` state) and request-scoped logging.
- **Build chain:** Replace direct `tsc` build with `xmcp build`, keep `tsconfig` for IDE support, retain Vitest for logic tests.

## 4. Migration Phases & Deliverables

### Phase 0 – Preparation (1 day)
1. **Version selection:** Pin XMCP to the bundled repo version (e.g., `0.4.0`) and ensure Node 20+ parity.
2. **Gap analysis:** Review XMCP examples (`xmcp/examples/stdio-transport`) for stdio usage, prompts, and resource patterns to map required hooks (done, but record findings in `/specs` for reference).
3. **Decide strategy:** Favor in-place migration within current repo rather than side-by-side to avoid duplicated Plone logic. Document rollback plan (keep `main` branch on legacy server until XMCP build passes).

### Phase 1 – Bootstrap XMCP Workspace (1–2 days)
1. **Add dependency:** Install `xmcp` (workspace or npm) plus peer deps (`zod@^3.24.4` already present).
2. **Scaffold entry:** Create `xmcp.config.ts` enabling `stdio`, referencing future middleware.
3. **CLI scripts:** Update `package.json` scripts → `dev: "xmcp dev"`, `build: "xmcp build"`, keep legacy commands temporarily under `legacy:*` for regression comparison.
4. **Binary shim:** Update `bin` to reference XMCP’s build output (likely `dist/stdio.js`). Provide compatibility wrapper that proxies `plone-mcp-server` to `node dist/stdio.js`.
5. **TypeScript setup:** Ensure XMCP’s TS config (usually `tsconfig.app.json`) aligns; extend existing `tsconfig.json` rather than replacing to keep Vitest path mappings.

### Phase 2 – Shared Infrastructure Extraction (1–2 days)
1. **Refactor `PloneToolHandlers`:** Split pure logic from registration glue. Convert handler methods into standalone functions under `src/lib/plone-tools/`.
2. **Client lifecycle:** Implement a singleton or context-aware provider (e.g., XMCP middleware storing config per session). `plone_configure` should set config in XMCP’s state store rather than `PloneToolHandlers`.
3. **Blocks TTL cache:** Replace in-memory member variables with XMCP resource store (e.g., use `context.storage` or a simple module-level map). Document expiry strategy.
4. **Error handling:** Port `setupErrorHandling` responsibilities into XMCP middleware (`onError` hooks + process signals).

### Phase 3 – Tool Module Migration (4–5 days)
1. **Mapping table:** Create a spreadsheet (or section in this doc) linking each legacy tool → new file path (e.g., `src/tools/content/create.ts` ↔ `plone_create_content`).
2. **Schema reuse:** Export current Zod schemas from `src/schemas/` so each tool file imports `PloneCreateContentSchema`. XMCP expects `export const schema = {...}` so wrap `z.object` definitions accordingly.
3. **Handler conversion:** Each tool module should default-export an async function receiving typed args and returning XMCP `CallToolResult`. Reuse logic from existing handlers.
4. **Conditional availability:** Re-implement `ENABLED_TOOLS` logic via XMCP `toolFilters` or by reading env in each module’s `metadata.annotations.enabled`.
5. **Testing:** For each converted tool, add Vitest coverage calling the module directly (mock Plone API via `nock`). Ensure parity with old tests.

### Phase 4 – Prompts & Resources (1 day)
1. **Prompts:** Convert `create-page-workflow` & `create-example-site-workflow` to `src/prompts/create-page-workflow.ts` etc., using XMCP prompt metadata shape.
2. **Resources:** Move `plone-content`, `plone-site-info`, `plone-types` handlers to `src/resources/plone/...`. Where resources hit live Plone endpoints, reuse shared client + ensure proper URI building.
3. **Auto-discovery:** Verify XMCP CLI auto-registers these modules; remove manual registration code from legacy entry.

### Phase 5 – Middleware & Configuration (1 day)
1. **Session configuration:** Implement XMCP middleware that requires `plone_configure` before other tools run (throw descriptive error otherwise).
2. **Auth options:** Leverage XMCP’s middleware to inject API-key / JWT guardrails if needed later (align with `/docs/authentication` guidance).
3. **Logging/metrics:** Hook into XMCP lifecycle events for structured logging, replacing ad-hoc `console.error`.

### Phase 6 – Build, Test, and QA Alignment (2 days)
1. **Scripts:** Ensure `make test`, `make type-check`, `make format` still work (may need to call `xmcp build` inside `make build`).
2. **CI updates:** Modify workflows to install `xmcp` CLI, run `xmcp build`, then `vitest`. Keep coverage thresholds unchanged.
3. **Legacy parity test:** Until rollout, run legacy `node dist/index.js` alongside XMCP binary in CI to compare JSON outputs for sampled tool calls.

### Phase 7 – Documentation & DX (1 day)
1. **README/AGENTS updates:** Document new commands (`xmcp dev`, `xmcp build`), directory layout, and configuration instructions.
2. **Upgrade notes:** Provide migration guide for downstream clients (CLI command change, potential env var differences).
3. **Specs:** Update `specs/` with architecture notes and tool mapping for future contributors.

### Phase 8 – Rollout & Cleanup (0.5–1 day)
1. **Beta tag:** Release an `xmcp`-backed beta npm tag (`1.1.0-xmcp.beta`). Encourage internal testing.
2. **Default release:** After validation, publish stable version, remove legacy server entry, and delete obsolete files (`src/index.ts`, manual registration scaffolding).
3. **Post-mortem:** Gather DX feedback, file follow-up tasks (e.g., adopt XMCP adapters like Express/Next if HTTP transport needed).

## 5. Testing & Validation Strategy
- **Unit tests:** Reuse existing Vitest suites; add new cases for middleware state, blocks cache, and resource auto-loading.
- **Integration tests:** Extend `tests/integration/mcp-server.test.ts` to spin up the XMCP binary via `xmcp dev --stdio` and run sample tool calls.
- **Manual verification:** Use XMCP Inspector (`xmcp inspector` equivalent) to confirm prompts/resources show up with correct metadata.
- **Regression matrix:** Compare responses between legacy and XMCP builds for representative scenarios (content CRUD, block workflows, search, workflow transitions).

## 6. Risks & Mitigations
- **State handling differences:** XMCP modules are stateless by default; ensure `plone_create_blocks_layout`’s 60-second TTL is enforced via centralized cache. Mitigation: implement a small in-memory store with timestamps and cover it with tests.
- **CLI disruption:** Consumers invoking `node dist/index.js` may break. Provide wrapper script and release notes before removing old entry.
- **XMCP updates:** Framework evolves quickly; lock dependency version and watch upstream changelog.
- **Testing complexity:** Auto-discovered modules may complicate targeted tests. Use explicit import testing rather than relying on discovery for unit cases.

## 7. Open Questions
1. Do we need HTTP transport (for deployment on Vercel/Replit) in addition to stdio? Decides `xmcp.config.ts` shape.
2. Should `plone_configure` persist across sessions (file-based) or remain in-memory per process?
3. Are there plans to add XMCP middlewares for auth (API key/JWT)? Impacts early architecture.
4. How will we version the npm package during migration (beta channel vs. direct major release)?

## 8. Next Steps
1. Confirm answers to open questions with stakeholders.
2. Schedule Phase 0/1 work and create corresponding tickets.
3. Stand up a proof-of-concept XMCP build (copy minimal tool) to validate CLI + config before wholesale migration.

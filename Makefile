.PHONY: all format test type-check docker-build docker-run docker-clean build dev dev-filtered start inspector test-watch test-coverage test-unit test-unit-only lint sanity-check-dev-server

PNPM_BIN = $(shell pnpm root)/.bin

help: ## Show this help.
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

format: ## Format code using Prettier.
	$(PNPM_BIN)/prettier --write "src/**/*.{ts,js}" 

#"tests/**/*.{ts,js}"

test: ## Run all tests.
	CI=true $(PNPM_BIN)/vitest run

test-watch: ## Run tests in watch mode.
	$(PNPM_BIN)/vitest --watch

test-coverage: ## Run tests with coverage report.
	$(PNPM_BIN)/vitest run --coverage

test-unit: ## Run unit tests only.
	$(PNPM_BIN)/vitest run tests/unit

test-unit-only: ## Run unit tests only with coverage.
	$(PNPM_BIN)/vitest tests/unit --coverage

lint: ## Lint code using ESLint.
	$(PNPM_BIN)/eslint "{src,tests}/**/*.ts"

lint-fix: ## Auto-fix lint issues in source files with ESLint.
	$(PNPM_BIN)/eslint --fix "{src,tests}/**/*.ts"

type-check: ## Run TypeScript type checking
	pnpm run type-check

docker-build: ## Build the Docker image.
	docker build -t plone-mcp .

docker-run: ## Run the Docker container.
	docker run --rm -it plone-mcp

docker-clean: ## Remove the Docker image.
	docker rmi plone-mcp

gen-agents-md: ## Generate AGENTS.md from a source markdown file.
	@echo "Generating $(OUTPUT_FILE)..."
	@mkdir -p scripts
	@python3 scripts/gen-agentsmd.py --input $(INPUT_FILE)$(if $(OUTPUT_FILE), --output $(OUTPUT_FILE))

build: ## Build for production.
	$(PNPM_BIN)/xmcp build

start: ## Start the HTTP server.
	node dist/http.js

dev: ## Start in development mode with hot reload.
	$(PNPM_BIN)/xmcp dev

dev-filtered: ## Start in development mode with only basic tools enabled (configure, get, search).
	export ENABLED_TOOLS=plone_configure,plone_get_content,plone_search; $(PNPM_BIN)/xmcp dev

sanity-check-dev-server: ## Test if dev server is running on localhost:3001/mcp.
	@echo "Testing dev server at http://localhost:3001/mcp..."
	@curl -s -X POST http://localhost:3001/mcp \
		-H "Content-Type: application/json" \
		-H "Accept: application/json" \
		-d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"sanity-check","version":"1.0.0"}}}' \
		-w "\nHTTP Status: %{http_code}\n" | grep -E '"jsonrpc":"2.0"|HTTP Status: 200' && echo "✓ Dev server is responding correctly" || echo "✗ Dev server is not responding"

inspector: ## Run with MCP Inspector on ports 4000/4001.
	DANGEROUSLY_OMIT_AUTH=true CLIENT_PORT=4000 SERVER_PORT=4001 npx @modelcontextprotocol/inspector node dist/http.js

ci:	## teste, type-check, lint and format
	make test
	make type-check
	make lint
	make format

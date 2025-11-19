.PHONY: all format test type-check docker-build docker-run docker-clean build dev start inspector test-watch test-coverage test-unit test-unit-only lint

PNPM_BIN = $(shell pnpm root)/.bin

help: ## Show this help.
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

format: ## Format code using Prettier.
	$(PNPM_BIN)/prettier --write "src/**/*.{ts,js}" "tests/**/*.{ts,js}"

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

type-check: ## Run TypeScript type checking
	$(PNPM_BIN)/tsc --noEmit

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

inspector: ## Run with MCP Inspector.
	$(PNPM_BIN)/mcp-inspector

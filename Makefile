.PHONY: all format test type-check docker-build docker-run docker-clean

all: ## Show this help.
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

format: ## Format code using Prettier.
	pnpm run format

test: ## Run all tests.
	CI=true pnpm test

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

build:
	pnpm build

start:
	pnpm dev

# Testing Guide for Plone MCP Server

This document describes the testing strategy for the Plone MCP server.

## Test Structure

```
__tests__/
├── setup.ts                    # Global test configuration
├── utils/
│   └── test-helpers.ts         # Test utilities and mocks
├── unit/                       # Unit tests
│   ├── plone-client.test.ts    # PloneClient class tests
│   └── blocks-helper.test.ts   # Block creation logic tests
└── integration/                # Integration tests with mocked APIs
    └── plone_get_content.test.ts # Example integration test
```

## Running Tests

The recommended way to run tests is via `make` to ensure all environment variables are correctly set.

### All Tests

```bash
make test
```

### Development

```bash
make test-watch         # Watch mode for development
make test-coverage      # Run with coverage report
```

### Specialized Runs

```bash
make test-unit          # Run unit tests only
make test-unit-only     # Run unit tests with coverage
```

## Test Types

### 1. Unit Tests

- Test individual functions and methods in isolation.
- Fast execution using `vitest`.
- Located in `__tests__/unit/`.

### 2. Integration Tests

- Test tool implementations with mocked Plone API responses using `nock`.
- Located in `__tests__/integration/`.

## Best Practices

1. **Isolation**: Each test should be independent.
2. **Mocking**: Use `nock` to intercept HTTP requests to Plone.
3. **Data Cleanup**: Ensure sessions and prepared blocks are cleared between tests.

## Continuous Integration

Tests run automatically on every push to the repository via GitHub Actions. A minimum coverage threshold is enforced to ensure code quality.

## Debugging Tests

To run a single test file:
```bash
pnpm vitest run __tests__/unit/blocks-helper.test.ts
```

To run tests matching a pattern:
```bash
pnpm vitest run -t "Block Helpers"
```

# Productboard MCP Test Guide

## Running Tests

### Run all tests
```bash
npm test
```

### Run specific test file
```bash
npm test -- tests/unit/tools/features/create-feature.test.ts
```

### Run tests with coverage
```bash
npm test -- --coverage
```

### Run remote MCP test (optional)
```bash
RUN_REMOTE_MCP_TESTS=true REMOTE_MCP_URL=https://productboard-mcp-production.up.railway.app/mcp \
  npm test -- tests/e2e/remote-mcp-ai-summary.test.ts
```

If you prefer to supply the base host instead, set `REMOTE_MCP_BASE_URL` (the test will append `/mcp`).

### Run tests in watch mode
```bash
npm test -- --watch
```

## Test Structure

```
tests/
├── unit/               # Unit tests for individual components
│   └── tools/
│       └── features/   # Feature management tool tests
├── integration/        # Integration tests for API interactions
├── e2e/               # End-to-end tests for complete workflows
├── fixtures/          # Shared test data and mocks
└── helpers/           # Test utilities and helpers
```

## Coverage Requirements

- Minimum coverage: 95% for all metrics
- Current coverage:
  - Statements: 100%
  - Branches: 96.29%
  - Functions: 100%
  - Lines: 100%

## Test Types

### Unit Tests
- Test individual tools in isolation
- Mock all external dependencies
- Focus on validation, transformation, and error handling
- Located in `tests/unit/`

### Integration Tests  
- Test API client interactions with HTTP mocks
- Verify retry logic and error handling
- Located in `tests/integration/`

### E2E Tests
- Test complete feature workflows
- Verify tool integration with MCP server
- Located in `tests/e2e/`

## Writing Tests

### Test Structure
```typescript
describe('ToolName', () => {
  let tool: ToolName;
  let mockClient: jest.Mocked<ProductboardAPIClient>;

  beforeEach(() => {
    // Setup
  });

  describe('metadata', () => {
    // Test tool metadata
  });

  describe('parameter validation', () => {
    // Test input validation
  });

  describe('execute', () => {
    // Test tool execution
  });
});
```

### Common Patterns

1. **Mocking API responses**
```typescript
mockClient.post.mockResolvedValueOnce(responseData);
```

2. **Testing errors**
```typescript
const error = new Error('API Error');
mockClient.post.mockRejectedValueOnce(error);
await expect(tool.execute(input)).rejects.toThrow('execution failed');
```

3. **Type assertions**
```typescript
const result = await tool.execute(input) as any;
expect(result.property).toBe(expectedValue);
```

## Test Data

Test fixtures are located in `tests/fixtures/` and provide:
- Mock feature data
- API error responses
- Invalid input examples
- No hardcoded values - all data is generated or configurable

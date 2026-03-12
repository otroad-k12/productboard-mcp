import {
  ValidationError,
  ToolExecutionError,
  ToolNotFoundError,
  MCPError,
  ConfigurationError,
} from '../../../src/utils/errors.js';

import {
  ProductboardAPIError,
  APIValidationError,
  APIAuthenticationError,
  APIAuthorizationError,
  APINotFoundError,
  APIRateLimitError,
  APIServerError,
  isRetryableError,
} from '../../../src/api/errors.js';

describe('Error Classes', () => {
  describe('ValidationError', () => {
    it('should create error with message and details', () => {
      const details = [
        { field: 'name', message: 'Name is required' },
        { field: 'email', message: 'Invalid email format' },
      ];
      
      const error = new ValidationError('Validation failed', details);
      
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.details).toEqual(details);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(MCPError);
    });

    it('should work without details', () => {
      const error = new ValidationError('Simple validation error');
      
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Simple validation error');
      expect(error.details).toBeUndefined();
    });

    it('should maintain stack trace', () => {
      const error = new ValidationError('Test error');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ValidationError');
    });
  });

  describe('ToolExecutionError', () => {
    it('should create error with tool name and cause', () => {
      const cause = new Error('Original error');
      const error = new ToolExecutionError('Tool failed', 'test-tool', cause);
      
      expect(error.name).toBe('ToolExecutionError');
      expect(error.message).toBe('Tool failed');
      expect(error.details).toMatchObject({ toolName: 'test-tool' });
    });

    it('should work without cause', () => {
      const error = new ToolExecutionError('Tool failed', 'test-tool');
      
      expect(error.name).toBe('ToolExecutionError');
      expect(error.details).toMatchObject({ toolName: 'test-tool' });
    });
  });

  describe('ToolNotFoundError', () => {
    it('should create error with tool name', () => {
      const error = new ToolNotFoundError('missing-tool');
      
      expect(error.name).toBe('ToolNotFoundError');
      expect(error.message).toBe('Tool not found: missing-tool');
      expect(error.details).toMatchObject({ toolName: 'missing-tool' });
    });
  });
});

describe('API Error Classes', () => {
  describe('ProductboardAPIError', () => {
    it('should create base API error', () => {
      const cause = new Error('Network error');
      const responseData = { error: 'Bad request' };
      
      const error = new ProductboardAPIError(
        'API request failed',
        'NETWORK_ERROR',
        cause,
        500,
        responseData
      );
      
      expect(error.name).toBe('ProductboardAPIError');
      expect(error.message).toBe('API request failed');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.cause).toBe(cause);
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual(responseData);
    });

    it('should provide JSON representation', () => {
      const error = new ProductboardAPIError(
        'API error',
        'TEST_ERROR',
        undefined,
        400,
        { field: 'invalid' }
      );
      
      const json = error.toJSON();
      
      expect(json).toEqual({
        name: 'ProductboardAPIError',
        message: 'API error',
        code: 'TEST_ERROR',
        statusCode: 400,
        details: { field: 'invalid' },
        cause: undefined,
      });
    });

    it('should work with minimal parameters', () => {
      const error = new ProductboardAPIError('Simple error', 'SIMPLE');
      
      expect(error.name).toBe('ProductboardAPIError');
      expect(error.message).toBe('Simple error');
      expect(error.code).toBe('SIMPLE');
      expect(error.statusCode).toBeUndefined();
      expect(error.details).toBeUndefined();
    });
  });

  describe('APIValidationError', () => {
    it('should create validation error with validation details', () => {
      const validationDetails = {
        errors: [
          { field: 'name', message: 'Required' },
          { field: 'email', message: 'Invalid format' },
        ]
      };
      
      const error = new APIValidationError('Validation failed', validationDetails);
      
      expect(error.name).toBe('APIValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('API_VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual(validationDetails);
    });

    it('should work without validation details', () => {
      const error = new APIValidationError('Validation failed');
      
      expect(error.name).toBe('APIValidationError');
      expect(error.details).toBeUndefined();
    });
  });

  describe('APIAuthenticationError', () => {
    it('should create authentication error', () => {
      const error = new APIAuthenticationError('Invalid credentials');
      
      expect(error.name).toBe('APIAuthenticationError');
      expect(error.message).toBe('Invalid credentials');
      expect(error.code).toBe('API_AUTHENTICATION_ERROR');
      expect(error.statusCode).toBe(401);
    });

    it('should suggest authentication actions', () => {
      const error = new APIAuthenticationError('Token expired');
      
      expect(error.message).toBe('Token expired');
      // Could include suggestions like refreshing token
    });
  });

  describe('APIAuthorizationError', () => {
    it('should create authorization error', () => {
      const error = new APIAuthorizationError('Insufficient permissions');
      
      expect(error.name).toBe('APIAuthorizationError');
      expect(error.message).toBe('Insufficient permissions');
      expect(error.code).toBe('API_AUTHORIZATION_ERROR');
      expect(error.statusCode).toBe(403);
    });

    it('should handle permission-specific messages', () => {
      const error = new APIAuthorizationError('Access denied to resource');
      
      expect(error.message).toBe('Access denied to resource');
    });
  });

  describe('APINotFoundError', () => {
    it('should create not found error with resource info', () => {
      const error = new APINotFoundError('Feature not found', 'feature');
      
      expect(error.name).toBe('APINotFoundError');
      expect(error.message).toBe('Feature not found');
      expect(error.code).toBe('API_NOT_FOUND_ERROR');
      expect(error.statusCode).toBe(404);
      expect((error.details as any)?.resource).toBe('feature');
    });

    it('should work without resource info', () => {
      const error = new APINotFoundError('Resource not found');
      
      expect(error.name).toBe('APINotFoundError');
      expect((error.details as any)?.resource).toBeUndefined();
    });
  });

  describe('APIRateLimitError', () => {
    it('should create rate limit error with retry info', () => {
      const error = new APIRateLimitError('Rate limit exceeded', 120);
      
      expect(error.name).toBe('APIRateLimitError');
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.code).toBe('API_RATE_LIMIT_ERROR');
      expect(error.statusCode).toBe(429);
      expect(error.retryAfter).toBe(120);
    });

    it('should work without retry info', () => {
      const error = new APIRateLimitError('Rate limit exceeded');
      
      expect(error.name).toBe('APIRateLimitError');
      expect(error.retryAfter).toBeUndefined();
    });

    it('should provide retry guidance', () => {
      const error = new APIRateLimitError('Too many requests', 60);
      
      expect(error.retryAfter).toBe(60);
      // Could include guidance on when to retry
    });
  });

  describe('APIServerError', () => {
    it('should create server error', () => {
      const error = new APIServerError('Internal server error', 500);
      
      expect(error.name).toBe('APIServerError');
      expect(error.message).toBe('Internal server error');
      expect(error.code).toBe('API_SERVER_ERROR');
      expect(error.statusCode).toBe(500);
    });

    it('should handle different server error codes', () => {
      const error502 = new APIServerError('Bad gateway', 502);
      const error503 = new APIServerError('Service unavailable', 503);
      
      expect(error502.statusCode).toBe(502);
      expect(error503.statusCode).toBe(503);
    });
  });
});

describe('Error Utility Functions', () => {
  describe('isRetryableError', () => {
    it('should identify retryable server errors', () => {
      const serverError = new APIServerError('Internal error', 500);
      const badGateway = new APIServerError('Bad gateway', 502);
      const serviceUnavailable = new APIServerError('Service unavailable', 503);
      
      expect(isRetryableError(serverError)).toBe(true);
      expect(isRetryableError(badGateway)).toBe(true);
      expect(isRetryableError(serviceUnavailable)).toBe(true);
    });

    it('should identify retryable rate limit errors', () => {
      const rateLimitError = new APIRateLimitError('Rate limited', 60);
      
      expect(isRetryableError(rateLimitError)).toBe(true);
    });

    it('should identify non-retryable client errors', () => {
      const validationError = new APIValidationError('Invalid data');
      const authError = new APIAuthenticationError('Unauthorized');
      const authzError = new APIAuthorizationError('Forbidden');
      const notFoundError = new APINotFoundError('Not found', 'resource');
      
      expect(isRetryableError(validationError)).toBe(false);
      expect(isRetryableError(authError)).toBe(false);
      expect(isRetryableError(authzError)).toBe(false);
      expect(isRetryableError(notFoundError)).toBe(false);
    });

    it('should handle network errors as retryable', () => {
      const networkError = new Error('ECONNRESET');
      const timeoutError = new Error('ETIMEDOUT');
      
      expect(isRetryableError(networkError)).toBe(true);
      expect(isRetryableError(timeoutError)).toBe(true);
    });

    it('should handle unknown errors conservatively', () => {
      const unknownError = new Error('Unknown error');
      const customError = new ProductboardAPIError('Custom', 'CUSTOM');
      
      // Generic errors (not ECONNRESET/ETIMEDOUT) are not retried
      expect(isRetryableError(unknownError)).toBe(false);
      expect(isRetryableError(customError)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isRetryableError(null as any)).toBe(false);
      expect(isRetryableError(undefined as any)).toBe(false);
      expect(isRetryableError('string error' as any)).toBe(false);
    });
  });
});

describe('Error Inheritance and Type Guards', () => {
  it('should maintain proper inheritance chain', () => {
    const apiError = new APIValidationError('Validation failed');
    
    expect(apiError).toBeInstanceOf(APIValidationError);
    expect(apiError).toBeInstanceOf(ProductboardAPIError);
    expect(apiError).toBeInstanceOf(Error);
  });

  it('should work with instanceof checks', () => {
    const errors = [
      new ValidationError('Validation'),
      new ToolExecutionError('Tool error', 'tool'),
      new ConfigurationError('Config error'),
      new APIValidationError('API validation'),
      new APIAuthenticationError('Auth error'),
      new APIAuthorizationError('Authz error'),
      new APINotFoundError('Not found'),
      new APIRateLimitError('Rate limit'),
      new APIServerError('Server error', 500),
    ];

    errors.forEach(error => {
      expect(error).toBeInstanceOf(Error);
    });

    const apiErrors = errors.slice(3); // API errors
    apiErrors.forEach(error => {
      expect(error).toBeInstanceOf(ProductboardAPIError);
    });
  });

  it('should handle error serialization', () => {
    const error = new ToolExecutionError(
      'Tool failed',
      'test-tool',
      new ValidationError('Validation failed', [{ field: 'test', message: 'Invalid' }])
    );

    const json = error.toJSON();

    expect(json.name).toBe('ToolExecutionError');
    expect((json.details as any)?.toolName).toBe('test-tool');
    expect((json.details as any)?.cause).toContain('Validation failed');
  });

  it('should preserve error context through chaining', () => {
    const apiError = new APIServerError('Service unavailable', 503);
    const toolError = new ToolExecutionError('Failed to fetch data', 'data-tool', apiError);

    expect(toolError.cause).toBe(apiError);
    expect((toolError.details as any)?.toolName).toBe('data-tool');
    expect(apiError.statusCode).toBe(503);
  });
});

describe('Error Scenarios', () => {
  it('should handle validation error with multiple fields', () => {
    const details = [
      { field: 'name', message: 'Name is required' },
      { field: 'email', message: 'Invalid email format' },
      { field: 'age', message: 'Must be a positive number' },
    ];
    
    const error = new ValidationError('Multiple validation errors', details);
    
    expect(error.details).toHaveLength(3);
    expect((error.details as any)[1].field).toBe('email');
  });

  it('should handle nested tool execution errors', () => {
    const apiError = new APIServerError('Database unavailable', 503);
    const toolError = new ToolExecutionError('Data fetch failed', 'fetch-tool', apiError);
    const parentToolError = new ToolExecutionError('Workflow failed', 'workflow-tool', toolError);

    expect((parentToolError.details as any)?.toolName).toBe('workflow-tool');
    expect((toolError.details as any)?.toolName).toBe('fetch-tool');
  });

  it('should handle API error with complex response data', () => {
    const responseData = {
      error: 'INVALID_REQUEST',
      details: {
        timestamp: '2023-01-01T00:00:00Z',
        requestId: 'req-123',
        violations: [
          { field: 'product_id', code: 'REQUIRED' },
          { field: 'name', code: 'TOO_LONG' },
        ]
      }
    };
    
    const error = new APIValidationError('Request validation failed', responseData);
    
    expect(error.details).toEqual(responseData);
    expect((error.details as any).details.violations).toHaveLength(2);
  });
});
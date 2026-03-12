import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { InMemoryOAuthClientProvider } from '@modelcontextprotocol/sdk/examples/client/simpleOAuthClientProvider.js';

const RUN_REMOTE_TESTS = process.env.RUN_REMOTE_MCP_TESTS === 'true';
const REMOTE_MCP_BASE_URL = process.env.REMOTE_MCP_BASE_URL ?? 'https://productboard-mcp-production.up.railway.app';

const describeRemote = RUN_REMOTE_TESTS ? describe : describe.skip;

const CALLBACK_URL = 'https://example.com/oauth/callback';

const clientMetadata = {
  client_name: 'productboard-mcp-remote-test',
  redirect_uris: [CALLBACK_URL],
  grant_types: ['authorization_code'],
  response_types: ['code'],
  token_endpoint_auth_method: 'none',
  logo_uri: undefined,
  tos_uri: undefined,
};

interface ToolContentBlock {
  type: string;
  text?: string;
}

interface ToolCallResult {
  content?: ToolContentBlock[];
  isError?: boolean;
}

describeRemote('Remote MCP AI project summary', () => {
  jest.setTimeout(30000);

  let client: Client;
  let transport: StreamableHTTPClientTransport;
  let oauthProvider: InMemoryOAuthClientProvider;
  let resolveAuthorizationUrl: ((url: URL) => void) | undefined;
  let authorizationUrlPromise: Promise<URL>;

  const createAuthorizationUrlPromise = () =>
    new Promise<URL>((resolve) => {
      resolveAuthorizationUrl = resolve;
    });

  const fetchAuthorizationCode = async (authorizationUrl: URL): Promise<string> => {
    const response = await fetch(authorizationUrl, { redirect: 'manual' });
    const redirectLocation = response.headers.get('location');
    if (!redirectLocation) {
      throw new Error('Authorization response missing redirect location');
    }

    const redirectUrl = new URL(redirectLocation);
    const code = redirectUrl.searchParams.get('code');
    const error = redirectUrl.searchParams.get('error');

    if (error) {
      throw new Error(`Authorization error: ${error}`);
    }

    if (!code) {
      throw new Error('Authorization code missing from redirect');
    }

    return code;
  };

  const connectClient = async () => {
    client = new Client({ name: 'productboard-mcp-remote-test', version: '1.0.0' });

    authorizationUrlPromise = createAuthorizationUrlPromise();
    oauthProvider = new InMemoryOAuthClientProvider(
      CALLBACK_URL,
      clientMetadata,
      (redirectUrl) => resolveAuthorizationUrl?.(redirectUrl)
    );

    transport = new StreamableHTTPClientTransport(new URL('/mcp', REMOTE_MCP_BASE_URL), {
      authProvider: oauthProvider,
    });

    try {
      await client.connect(transport);
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        throw error;
      }

      const authorizationUrl = await authorizationUrlPromise;
      const authorizationCode = await fetchAuthorizationCode(authorizationUrl);

      await transport.finishAuth(authorizationCode);
      await client.connect(transport);
    }
  };

  const extractToolText = (result: ToolCallResult): string => {
    const textBlock = result.content?.find((block) => block?.type === 'text');
    return typeof textBlock?.text === 'string' ? textBlock.text : '';
  };

  beforeAll(async () => {
    await connectClient();
  });

  afterAll(async () => {
    if (transport) {
      await transport.close();
    }
  });

  it('summarizes AI-related projects that are in progress or future scheduled', async () => {
    const inProgress = (await client.callTool({
      name: 'pb_feature_list',
      arguments: { status: 'in_progress', search: 'ai' },
    })) as ToolCallResult;

    const futureScheduled = (await client.callTool({
      name: 'pb_feature_list',
      arguments: { status: 'new', search: 'ai' },
    })) as ToolCallResult;

    const inProgressText = extractToolText(inProgress);
    const futureScheduledText = extractToolText(futureScheduled);

    const summary = [
      'AI-related projects summary:',
      '',
      'In progress:',
      inProgressText || 'No in-progress projects found.',
      '',
      'Future scheduled:',
      futureScheduledText || 'No future scheduled projects found.',
    ].join('\n');

    expect(inProgress.isError).not.toBe(true);
    expect(futureScheduled.isError).not.toBe(true);
    expect(inProgressText).toMatch(/Found|No features found/);
    expect(futureScheduledText).toMatch(/Found|No features found/);
    expect(summary).toContain('AI-related projects summary:');
  });
});

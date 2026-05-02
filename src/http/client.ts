import { request as playwrightRequest } from '@playwright/test';

type ApiResponse = {
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
  method: string;
  path: string;
  responseBody: string;
};

export type ApiClient = {
  get: (path: string) => Promise<ApiResponse>;
  post: (path: string, body?: unknown) => Promise<ApiResponse>;
  put: (path: string, body?: unknown) => Promise<ApiResponse>;
  delete: (path: string) => Promise<ApiResponse>;
  postMultipart: (path: string, fields: Record<string, string | { name: string; mimeType: string; buffer: Buffer }>) => Promise<ApiResponse>;
};

function logRequest(method: string, path: string, body?: unknown): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] --> ${method} ${path}`);
  if (body !== undefined) {
    console.log(`    Request body: ${JSON.stringify(body)}`);
  }
}

function logResponse(method: string, path: string, status: number, body: string, durationMs: number): void {
  const timestamp = new Date().toISOString();
  const statusEmoji = status >= 200 && status < 300 ? '✓' : status >= 400 ? '✗' : '⚠';
  console.log(`[${timestamp}] <-- ${method} ${path} ${status} ${statusEmoji} (${durationMs}ms)`);
  console.log(`    Response body: ${body}`);
}

async function wrapResponse(
  method: string,
  path: string,
  res: Awaited<ReturnType<typeof playwrightRequest.newContext>>['get'] extends (...args: unknown[]) => Promise<infer R> ? R : never,
  startTime: number
): Promise<ApiResponse> {
  const status = res.status();
  const responseBody = await res.text();
  const durationMs = Date.now() - startTime;

  logResponse(method, path, status, responseBody, durationMs);

  return {
    status,
    method,
    path,
    responseBody,
    json: async () => JSON.parse(responseBody),
    text: async () => responseBody
  };
}

export async function createApiClient(args: {
  baseUrl: string;
  idToken: string;
  e2eRunId: string;
}): Promise<ApiClient> {
  const ctx = await playwrightRequest.newContext({
    baseURL: args.baseUrl,
    extraHTTPHeaders: {
      authorization: `Bearer ${args.idToken}`,
      'x-e2e-run-id': args.e2eRunId
    }
  });

  return {
    get: async (path: string) => {
      logRequest('GET', path);
      const startTime = Date.now();
      const res = await ctx.get(path);
      return wrapResponse('GET', path, res, startTime);
    },
    post: async (path: string, body?: unknown) => {
      logRequest('POST', path, body);
      const startTime = Date.now();
      const res = await ctx.post(path, body === undefined ? undefined : {
        data: body,
        headers: { 'content-type': 'application/json' }
      });
      return wrapResponse('POST', path, res, startTime);
    },
    put: async (path: string, body?: unknown) => {
      logRequest('PUT', path, body);
      const startTime = Date.now();
      const res = await ctx.put(path, body === undefined ? undefined : {
        data: body,
        headers: { 'content-type': 'application/json' }
      });
      return wrapResponse('PUT', path, res, startTime);
    },
    delete: async (path: string) => {
      logRequest('DELETE', path);
      const startTime = Date.now();
      const res = await ctx.delete(path);
      return wrapResponse('DELETE', path, res, startTime);
    },
    postMultipart: async (
      path: string,
      fields: Record<string, string | { name: string; mimeType: string; buffer: Buffer }>
    ) => {
      logRequest('POST (multipart)', path, '[multipart data]');
      const startTime = Date.now();
      const res = await ctx.post(path, { multipart: fields });
      return wrapResponse('POST', path, res, startTime);
    }
  };
}

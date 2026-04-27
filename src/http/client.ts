import { request as playwrightRequest } from '@playwright/test';

type ApiResponse = { status: number; json: () => Promise<unknown>; text: () => Promise<string> };

export type ApiClient = {
  get: (path: string) => Promise<ApiResponse>;
  post: (path: string, body?: unknown) => Promise<ApiResponse>;
  put: (path: string, body?: unknown) => Promise<ApiResponse>;
  delete: (path: string) => Promise<ApiResponse>;
  postMultipart: (path: string, fields: Record<string, string | { name: string; mimeType: string; buffer: Buffer }>) => Promise<ApiResponse>;
};

export async function createApiClient(args: {
  baseUrl: string;
  idToken: string;
  e2eRunId: string;
}): Promise<ApiClient> {
  const ctx = await playwrightRequest.newContext({
    baseURL: args.baseUrl,
    extraHTTPHeaders: {
      authorization: `Bearer ${args.idToken}`,
      'x-e2e-run-id': args.e2eRunId,
      'content-type': 'application/json'
    }
  });

  return {
    get: async (path: string) => {
      const res = await ctx.get(path);
      return {
        status: res.status(),
        json: async () => await res.json(),
        text: async () => await res.text()
      };
    },
    post: async (path: string, body?: unknown) => {
      const res = await ctx.post(path, body === undefined ? undefined : { data: body });
      return {
        status: res.status(),
        json: async () => await res.json(),
        text: async () => await res.text()
      };
    },
    put: async (path: string, body?: unknown) => {
      const res = await ctx.put(path, body === undefined ? undefined : { data: body });
      return {
        status: res.status(),
        json: async () => await res.json(),
        text: async () => await res.text()
      };
    },
    delete: async (path: string) => {
      const res = await ctx.delete(path);
      return {
        status: res.status(),
        json: async () => await res.json(),
        text: async () => await res.text()
      };
    },
    postMultipart: async (
      path: string,
      fields: Record<string, string | { name: string; mimeType: string; buffer: Buffer }>
    ) => {
      const res = await ctx.post(path, { multipart: fields });
      return {
        status: res.status(),
        json: async () => await res.json(),
        text: async () => await res.text()
      };
    }
  };
}

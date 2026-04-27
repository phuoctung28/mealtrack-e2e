import { request as playwrightRequest } from '@playwright/test';

export type ApiClient = {
  get: (path: string) => Promise<{ status: number; json: () => Promise<unknown>; text: () => Promise<string> }>;
  post: (
    path: string,
    body?: unknown
  ) => Promise<{ status: number; json: () => Promise<unknown>; text: () => Promise<string> }>;
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
    }
  };
}


import type { Fetcher, PagesFunction } from '@cloudflare/workers-types';

interface Env {
  CRYPTDROP_API: Fetcher;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  // A missing binding fails the request; never fall back to a public API URL.
  return context.env.CRYPTDROP_API.fetch(context.request);
};

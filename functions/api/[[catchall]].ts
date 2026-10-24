import type { Fetcher, PagesFunction } from '@cloudflare/workers-types';

interface Env {
  CRYPTDROP_API: Fetcher;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  return context.env.CRYPTDROP_API.fetch(context.request);
};

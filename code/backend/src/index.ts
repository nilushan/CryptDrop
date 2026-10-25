import app from './app.js';
import type { Env } from './types.js';

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const { pathname } = new URL(request.url);

    // Keep every API request (including unknown routes) out of asset handling.
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return app.fetch(request, env, ctx);
    }

    // Existing assets normally bypass this code. Delegate misses to the asset
    // service as well so it owns HTML redirects, method handling and 404s.
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

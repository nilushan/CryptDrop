import { describe, expect, it, vi } from 'vitest';
import worker from '../src/index';
import type { Env } from '../src/types';

function fixture() {
  const statement = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(null),
    run: vi.fn().mockResolvedValue({ success: true }),
  };
  const assetsFetch = vi.fn().mockResolvedValue(new Response('static response'));
  const env = {
    ASSETS: { fetch: assetsFetch },
    DB: { prepare: vi.fn().mockReturnValue(statement) },
    SITE_URL: 'https://cryptdrop.example',
    RESEND_API_KEY: '',
  } as unknown as Env;
  const ctx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() } as unknown as ExecutionContext;
  const request = (path: string, init?: RequestInit) => worker.fetch(new Request(`https://cryptdrop.example${path}`, init), env, ctx);
  return { env, assetsFetch, request };
}

describe('combined Worker entry point', () => {
  it('serves the API without touching static assets or D1 for health checks', async () => {
    const { request, assetsFetch, env } = fixture();
    const response = await request('/api/health');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(await response.json()).toEqual({ status: 'ok', timestamp: expect.any(String) });
    expect(assetsFetch).not.toHaveBeenCalled();
    expect(env.DB.prepare).not.toHaveBeenCalled();
  });

  it.each(['/api', '/api/', '/api/missing', '/api/health/missing'])('returns an API 404, not HTML, for %s', async (path) => {
    const { request, assetsFetch } = fixture();
    const response = await request(path);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'API route not found' });
    expect(assetsFetch).not.toHaveBeenCalled();
  });

  it.each(['/', '/app', '/invite?token=example', '/security/', '/_astro/app.js', '/missing', '/api-other'])('delegates non-API requests to the asset service: %s', async (path) => {
    const { request, assetsFetch, env } = fixture();
    const response = await request(path);
    expect(await response.text()).toBe('static response');
    expect(assetsFetch).toHaveBeenCalledOnce();
    expect(assetsFetch.mock.calls[0][0].url).toBe(`https://cryptdrop.example${path}`);
    expect(env.DB.prepare).not.toHaveBeenCalled();
  });

  it.each([
    ['/api/register', { error: 'Missing required fields: email, name, publicKey, fingerprint' }],
    ['/api/invite', { error: 'Missing required fields' }],
    ['/api/notify', { error: 'Unknown notification type' }],
  ])('preserves POST route validation: %s', async (path, body) => {
    const { request, assetsFetch } = fixture();
    const response = await request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(body);
    expect(assetsFetch).not.toHaveBeenCalled();
  });

  it('preserves lookup and invitation GET routes', async () => {
    const { request, assetsFetch } = fixture();
    const lookup = await request('/api/lookup/invalid');
    expect(lookup.status).toBe(400);
    expect(await lookup.json()).toEqual({ error: 'Invalid email address' });
    const invite = await request('/api/invite/unknown-token');
    expect(invite.status).toBe(404);
    expect(await invite.json()).toEqual({ valid: false, error: 'Invitation not found' });
    expect(assetsFetch).not.toHaveBeenCalled();
  });

  it('preserves CORS preflight handling on API requests', async () => {
    const { request, assetsFetch } = fixture();
    const response = await request('/api/register', {
      method: 'OPTIONS',
      headers: { Origin: 'https://cryptdrop.example', 'Access-Control-Request-Method': 'POST' },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://cryptdrop.example');
    expect(assetsFetch).not.toHaveBeenCalled();
  });
});

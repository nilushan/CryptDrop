import { describe, expect, it, vi } from 'vitest';
import worker from '../src/index';
import type { Env } from '../src/types';

function fixture() {
  const statement = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(null),
    run: vi.fn().mockResolvedValue({ success: true }),
  };
  const env = {
    DB: { prepare: vi.fn().mockReturnValue(statement) },
    SITE_URL: 'https://cryptdrop.example',
    RESEND_API_KEY: '',
  } as unknown as Env;
  const ctx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() } as unknown as ExecutionContext;
  const request = (path: string, init?: RequestInit) => worker.fetch(new Request(`https://cryptdrop.example${path}`, init), env, ctx);
  return { env, request };
}

describe('API-only Worker entry point', () => {
  it('serves health checks without touching D1 or requiring static assets', async () => {
    const { request, env } = fixture();
    const response = await request('/api/health');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(await response.json()).toEqual({ status: 'ok', timestamp: expect.any(String) });
    expect(env.DB.prepare).not.toHaveBeenCalled();
  });

  it.each(['/api', '/api/', '/api/missing', '/api/health/missing', '/', '/app', '/invite?token=example', '/security/', '/_astro/app.js', '/missing', '/api-other'])('returns JSON 404s without serving frontend HTML: %s', async (path) => {
    const { request, env } = fixture();
    const response = await request(path);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'API route not found' });
    expect(env.DB.prepare).not.toHaveBeenCalled();
  });

  it.each([
    ['/api/register', { error: 'Missing required fields: email, name, publicKey, fingerprint' }],
    ['/api/invite', { error: 'Missing required fields' }],
    ['/api/notify', { error: 'Unknown notification type' }],
  ])('preserves POST route validation: %s', async (path, body) => {
    const { request } = fixture();
    const response = await request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(body);
  });

  it('preserves lookup and invitation GET routes', async () => {
    const { request } = fixture();
    const lookup = await request('/api/lookup/invalid');
    expect(lookup.status).toBe(400);
    expect(await lookup.json()).toEqual({ error: 'Invalid email address' });
    const invite = await request('/api/invite/unknown-token');
    expect(invite.status).toBe(404);
    expect(await invite.json()).toEqual({ valid: false, error: 'Invitation not found' });
  });

  it('preserves CORS preflight handling on API requests', async () => {
    const { request } = fixture();
    const response = await request('/api/register', {
      method: 'OPTIONS',
      headers: { Origin: 'https://cryptdrop.example', 'Access-Control-Request-Method': 'POST' },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://cryptdrop.example');
  });
});

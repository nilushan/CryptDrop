// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { onRequest } from '../functions/api/[[catchall]]';

type Context = Parameters<typeof onRequest>[0];

describe('Pages API service-binding proxy', () => {
  it.each(['GET', 'POST', 'OPTIONS'])('forwards the original %s request and returns the Worker response unchanged', async (method) => {
    const request = new Request('https://cryptdrop.example/api/register?example=1', {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Example': 'unchanged' },
      ...(method === 'POST' ? { body: '{"name":"Example"}' } : {}),
    });
    const response = Response.json({ error: 'Example API response' }, { status: 429, headers: { 'X-Example': 'backend' } });
    const fetch = vi.fn().mockResolvedValue(response);
    const result = await onRequest({ request, env: { CRYPTDROP_API: { fetch } } } as unknown as Context);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(request);
    expect(result).toBe(response);
  });

  it('fails closed when the service binding is missing', async () => {
    await expect(onRequest({ request: new Request('https://cryptdrop.example/api/health'), env: {} } as unknown as Context)).rejects.toThrow();
  });
});

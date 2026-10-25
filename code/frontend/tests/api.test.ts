import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupKey, registerUser, sendDecryptInstructions, sendInvitation, validateInviteToken } from '../src/lib/api';

afterEach(() => vi.unstubAllGlobals());

describe('same-origin API client', () => {
  it('uses relative URLs for key and invitation lookups', async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ found: true, valid: true })));
    vi.stubGlobal('fetch', fetch);
    await lookupKey('person+tag@example.com');
    await validateInviteToken('a/b?c');
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/api/lookup/person%2Btag%40example.com',
      '/api/invite/a%2Fb%3Fc',
    ]);
  });

  it('preserves JSON payloads for all POST endpoints', async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ ok: true })));
    vi.stubGlobal('fetch', fetch);
    const user = { email: 'person@example.com', name: 'Person', publicKey: 'public', fingerprint: 'fingerprint', inviteToken: 'token' };
    const invitation = { senderEmail: 'sender@example.com', senderName: 'Sender', recipientEmail: 'person@example.com' };
    const notification = { recipientEmail: 'person@example.com', senderName: 'Sender', filename: 'example.txt' };
    await registerUser(user);
    await sendInvitation(invitation);
    await sendDecryptInstructions(notification);
    expect(fetch.mock.calls.map(([url, init]) => [url, init.method, JSON.parse(init.body)])).toEqual([
      ['/api/register', 'POST', user],
      ['/api/invite', 'POST', invitation],
      ['/api/notify', 'POST', { type: 'decrypt-instructions', ...notification }],
    ]);
  });

  it('retains not-found and error behavior', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ found: false }, { status: 404 }))
      .mockResolvedValueOnce(Response.json({ error: 'Too many requests' }, { status: 429 }));
    vi.stubGlobal('fetch', fetch);
    await expect(lookupKey('missing@example.com')).resolves.toEqual({ found: false, email: 'missing@example.com' });
    await expect(validateInviteToken('token')).rejects.toThrow('Too many requests');
  });
});

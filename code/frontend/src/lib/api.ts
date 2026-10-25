async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    signal: init?.signal ?? AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function registerUser(user: {
  email: string;
  name: string;
  publicKey: string;
  fingerprint: string;
  inviteToken?: string;
}): Promise<{ ok: boolean; invitationsAccepted: number }> {
  return apiFetch('/api/register', {
    method: 'POST',
    body: JSON.stringify(user),
  });
}

export interface LookupResult {
  found: boolean;
  source?: 'registry' | 'keyserver';
  name?: string;
  email: string;
  publicKey?: string;
  fingerprint?: string;
}

export async function lookupKey(email: string): Promise<LookupResult> {
  try {
    return await apiFetch<LookupResult>(`/api/lookup/${encodeURIComponent(email)}`);
  } catch (e) {
    if ((e as Error).message.includes('404')) {
      return { found: false, email };
    }
    throw e;
  }
}

export async function sendInvitation(invitation: {
  senderEmail: string;
  senderName: string;
  recipientEmail: string;
}): Promise<{ ok: boolean; token: string }> {
  return apiFetch('/api/invite', {
    method: 'POST',
    body: JSON.stringify(invitation),
  });
}

export interface InviteValidation {
  valid: boolean;
  senderName?: string;
  senderEmail?: string;
  recipientEmail?: string;
  status?: string;
  token?: string; // echoed back so the frontend can pass it to registration
}

export async function validateInviteToken(token: string): Promise<InviteValidation> {
  return apiFetch<InviteValidation>(`/api/invite/${encodeURIComponent(token)}`);
}

export async function sendDecryptInstructions(data: {
  recipientEmail: string;
  senderName: string;
  filename: string;
}): Promise<{ ok: boolean }> {
  return apiFetch('/api/notify', {
    method: 'POST',
    body: JSON.stringify({ type: 'decrypt-instructions', ...data }),
  });
}

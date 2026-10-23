import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import InviteAcceptPage from '../src/components/invite/InviteAcceptPage';
import { validateInviteToken } from '../src/lib/api';
vi.mock('../src/lib/api', () => ({ validateInviteToken: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); window.history.replaceState({}, '', '/'); });

describe('invitation acceptance feedback', () => {
  it('keeps a page heading and manual setup fallback for a missing token', async () => {
    render(<InviteAcceptPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Accept invitation' })).toBeVisible();
    expect(await screen.findByRole('alert')).toHaveTextContent('Missing invitation link');
    expect(screen.getByRole('link', { name: 'Go to the app' })).toHaveAttribute('href', '/app?tab=keyring');
    expect(validateInviteToken).not.toHaveBeenCalled();
  });
  it('announces pending validation', () => {
    window.history.replaceState({}, '', '/invite?token=synthetic');
    vi.mocked(validateInviteToken).mockReturnValue(new Promise(() => {}));
    render(<InviteAcceptPage />); expect(screen.getByRole('status')).toHaveTextContent('Validating invitation');
  });
  it.each([
    ['accepted', 'This invitation has already been used.'],
    ['expired', 'This invitation is no longer valid.'],
  ])('retains %s state', async (status, text) => {
    window.history.replaceState({}, '', '/invite?token=synthetic');
    vi.mocked(validateInviteToken).mockResolvedValue({ valid: false, status });
    render(<InviteAcceptPage />); expect(await screen.findByRole('alert')).toHaveTextContent(text);
  });
  it('retains failed validation with recovery destination', async () => {
    window.history.replaceState({}, '', '/invite?token=synthetic');
    vi.mocked(validateInviteToken).mockRejectedValue(new Error('Offline'));
    render(<InviteAcceptPage />); expect(await screen.findByRole('alert')).toHaveTextContent('Could not validate invitation. Please try again.');
    expect(screen.getByRole('link', { name: 'Go to the app' })).toBeVisible();
  });
  it('preserves encoded invitation forwarding to key setup', async () => {
    window.history.replaceState({}, '', '/invite?token=synthetic');
    vi.mocked(validateInviteToken).mockResolvedValue({ valid: true, senderName: 'Synthetic Sender', token: 'example/+ token' });
    render(<InviteAcceptPage />);
    expect(await screen.findByRole('link', { name: 'Set Up My Keys' })).toHaveAttribute('href', '/app?tab=keyring&inviteToken=example%2F%2B%20token');
    expect(screen.getByRole('status')).toHaveTextContent('Synthetic Sender');
  });
});

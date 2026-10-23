import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import FileDropZone from '../src/components/shared/FileDropZone';
import FolderBar from '../src/components/shared/FolderBar';
import EncryptTab from '../src/components/encrypt/EncryptTab';
import { $contacts } from '../src/stores/contacts';
import { $activeTab } from '../src/stores/activeTab';

// Keep network and cryptography out of UI tests; real round trips have their own tests.
vi.mock('openpgp', () => ({}));
vi.mock('../src/components/shared/KeyLookupWithInvite', () => ({
  default: ({ onKeyFound }: { onKeyFound: (result: unknown) => void }) => (
    <button onClick={() => onKeyFound({ email: 'test@example.com', name: 'Test recipient', armored: 'test-key', fingerprint: 'ABCD' })}>Mock import recipient</button>
  ),
}));

afterEach(() => { cleanup(); $contacts.set([]); $activeTab.set('encrypt'); });

describe('file workspace controls', () => {
  it('keeps the native file picker focusable and named', () => {
    render(<FileDropZone onFile={vi.fn()} placeholder="Choose a file" />);
    const input = screen.getByLabelText('Choose a file');
    expect(input).toHaveAttribute('type', 'file');
    expect(input).not.toHaveClass('hidden');
    input.focus();
    expect(input).toHaveFocus();
  });

  it('accepts a selected file and a dropped file', () => {
    const onFile = vi.fn();
    render(<FileDropZone onFile={onFile} placeholder="Choose a file" />);
    const file = new File(['test'], 'document.txt');
    const input = screen.getByLabelText('Choose a file');
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFile).toHaveBeenCalledWith(file);
    expect(input).toHaveValue('');
    fireEvent.drop(input.closest('label')!, { dataTransfer: { files: [file] } });
    expect(onFile).toHaveBeenCalledTimes(2);
  });

  it('treats default downloads as a supported path, not a warning', () => {
    render(<FolderBar folderHandle={null} onFolderChange={vi.fn()} />);
    expect(screen.getByText('Save location: your browser’s downloads folder')).toBeInTheDocument();
    expect(screen.queryByText(/not available/i)).not.toBeInTheDocument();
  });

  it('lets a first-time user select a recipient without leaving Encrypt', () => {
    $contacts.set([]);
    render(<EncryptTab />);
    const lookupButton = screen.getByRole('button', { name: 'Mock import recipient' });
    lookupButton.focus();
    fireEvent.click(lookupButton);
    expect(screen.getByText('Test recipient')).toBeInTheDocument();
    const fileInput = screen.getByLabelText('Drop a file here or click to select');
    expect(fileInput).toHaveFocus();
    fireEvent.change(fileInput, { target: { files: [new File(['test'], 'test.txt')] } });
    const removeButton = screen.getByRole('button', { name: 'Remove file' });
    removeButton.focus();
    fireEvent.click(removeButton);
    expect(screen.getByLabelText('Drop a file here or click to select')).toHaveFocus();
    expect($activeTab.get()).toBe('encrypt');
    fireEvent.click(screen.getByRole('button', { name: /change/i }));
    expect(screen.getByRole('button', { name: 'Mock import recipient' })).toBeInTheDocument();
  });
});

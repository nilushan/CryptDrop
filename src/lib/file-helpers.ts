export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function sanitizeFolderName(name: string): string {
  return (
    name
      .replace(/[^a-zA-Z0-9@._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'unknown'
  );
}

export function shortName(fullName: string): string {
  if (!fullName) return '?';
  const clean =
    fullName.indexOf('<') > 0
      ? fullName.substring(0, fullName.indexOf('<')).trim()
      : fullName;
  const first = clean.split(/\s+/)[0];
  return first.length > 12 ? first.substring(0, 11) + '…' : first;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadTextFile(text: string, filename: string): void {
  downloadBlob(new Blob([text], { type: 'text/plain' }), filename);
}

export function isFSASupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function pickSaveFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFSASupported()) return null;
  try {
    return await (window as unknown as Record<string, CallableFunction>).showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'downloads',
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') return null;
    throw e;
  }
}

export async function saveToFolder(
  blob: Blob,
  filename: string,
  subDir: string,
  folderHandle: FileSystemDirectoryHandle | null,
): Promise<string> {
  if (!folderHandle) {
    downloadBlob(blob, filename);
    return filename;
  }
  try {
    const parts = subDir.split('/').filter(Boolean);
    let dir = folderHandle;
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part, { create: true });
    }
    const fileHandle = await dir.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return `${folderHandle.name}/${subDir}/${filename}`;
  } catch {
    downloadBlob(blob, filename);
    return filename;
  }
}

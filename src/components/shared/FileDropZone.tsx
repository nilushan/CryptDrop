import { useRef } from 'react';

interface Props {
  /** Called when a file is selected via click or drop */
  onFile: (file: File) => void;
  /** Placeholder text shown inside the zone */
  placeholder?: string;
  /** Size variant — 'lg' or 'sm' */
  size?: 'lg' | 'sm';
  /** File input accept filter */
  accept?: string;
  /** Focus the file input when a user advances to this step. */
  autoFocus?: boolean;
  /** Extra CSS classes */
  className?: string;
}

export default function FileDropZone({
  onFile,
  placeholder = 'Drop a file here or click to select',
  size = 'lg',
  accept,
  autoFocus = false,
  className = '',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  }

  function handleDragLeave(e: React.DragEvent) {
    e.currentTarget.classList.remove('dragover');
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const file = e.dataTransfer?.files[0];
    if (file) onFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    // Let users pick the same file again after removing it.
    e.target.value = '';
  }

  return (
    <label
      className={`drop-zone drop-zone-${size} block ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        autoFocus={autoFocus}
        className="file-input-accessible"
        aria-label={placeholder}
        onChange={handleChange}
      />
      {size === 'lg' && (
        <svg className="drop-icon" width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      )}
      <p className="text-sm text-gray-500">{placeholder}</p>
      {size === 'lg' && <span className="drop-browse" aria-hidden="true">Browse files</span>}
    </label>
  );
}

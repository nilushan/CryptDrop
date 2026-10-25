interface Props {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  className?: string;
}

function Spinner() {
  return (
    <svg aria-hidden="true" className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export default function ActionButton({ onClick, disabled, loading, loadingText, children, className = 'btn-primary w-full' }: Props) {
  return (
    <button
      type="button"
      aria-busy={loading || undefined}
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
    >
      {loading ? (
        <>
          <Spinner />
          {loadingText || 'Processing…'}
        </>
      ) : (
        children
      )}
    </button>
  );
}

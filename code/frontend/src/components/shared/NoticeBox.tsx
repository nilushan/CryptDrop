interface Props {
  variant: 'info' | 'warn' | 'success' | 'error';
  role?: 'status' | 'alert';
  className?: string;
  children: React.ReactNode;
}

export default function NoticeBox({ variant, role, className = '', children }: Props) {
  return (
    <div role={role} className={`notice-box notice-${variant} ${className}`}>
      {children}
    </div>
  );
}

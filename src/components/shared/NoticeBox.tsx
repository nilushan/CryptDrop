interface Props {
  variant: 'info' | 'warn' | 'success';
  className?: string;
  children: React.ReactNode;
}

export default function NoticeBox({ variant, className = '', children }: Props) {
  return (
    <div className={`notice-box notice-${variant} ${className}`}>
      {children}
    </div>
  );
}

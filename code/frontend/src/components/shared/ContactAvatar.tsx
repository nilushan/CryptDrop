interface Props {
  name: string;
  className?: string;
}

export default function ContactAvatar({ name, className = '' }: Props) {
  return (
    <div className={`encrypt-contact-avatar ${className}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

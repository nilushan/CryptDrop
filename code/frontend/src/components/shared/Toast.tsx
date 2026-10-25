import { useStore } from '@nanostores/react';
import { $toast } from '../../stores/toast';

export default function Toast() {
  const toast = useStore($toast);

  // Keep the live region mounted so a new message is an announced update.
  // Form/operation owners also retain errors beside the relevant controls.
  return (
    <div className="toast-region" role="status" aria-live="polite" aria-atomic="true">
      {toast && <div className={`toast-message toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}

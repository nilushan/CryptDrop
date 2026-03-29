import { useStore } from '@nanostores/react';
import { $toast, type ToastType } from '../../stores/toast';

const COLORS: Record<ToastType, string> = {
  info: 'bg-gray-800 text-white',
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  warning: 'bg-amber-600 text-white',
};

export default function Toast() {
  const toast = useStore($toast);

  if (!toast) return null;

  return (
    <div className="fixed z-50" style={{ bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)' }}>
      <div className={`px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${COLORS[toast.type]}`}>
        {toast.msg}
      </div>
    </div>
  );
}

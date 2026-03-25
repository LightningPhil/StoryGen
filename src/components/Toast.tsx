import type { ToastMessage } from '../App';

export function Toast({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: number) => void }) {
  return (
    <div
      className={`toast toast-${toast.type} toast-visible`}
      onClick={() => onRemove(toast.id)}
    >
      {toast.message}
    </div>
  );
}

export function ToastContainer({ toasts, onRemove }: { toasts: ToastMessage[]; onRemove: (id: number) => void }) {
  return (
    <div id="toastContainer" className="toast-container">
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

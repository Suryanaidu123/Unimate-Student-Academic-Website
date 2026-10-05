import { Loader2 } from 'lucide-react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  // Support both old (confirmText) and new (confirmLabel) prop names
  confirmLabel,
  confirmText = 'Confirm',
  cancelLabel,
  cancelText = 'Cancel',
  variant = 'danger',
  confirmVariant,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const btnVariant = confirmVariant || variant;
  const confirmBtn = confirmLabel || confirmText;
  const cancelBtn  = cancelLabel  || cancelText;

  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-slate-600">{message}</p>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          {cancelBtn}
        </Button>
        <Button variant={btnVariant} onClick={onConfirm} disabled={loading}>
          {loading && <Loader2 size={14} className="animate-spin mr-1" />}
          {confirmBtn}
        </Button>
      </div>
    </Modal>
  );
}

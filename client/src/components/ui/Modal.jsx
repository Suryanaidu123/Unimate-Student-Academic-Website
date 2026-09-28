export default function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h3 className="font-semibold">{title}</h3>
          <button className="text-slate-400 hover:text-slate-700" onClick={onClose}>✕</button>
        </div>
        <div className="p-4">{children}</div>
        {footer && <div className="border-t border-slate-200 p-4 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
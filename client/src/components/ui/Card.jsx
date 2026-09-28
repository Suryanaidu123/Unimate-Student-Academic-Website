export default function Card({ title, subtitle, children, actions, className = '' }) {
  return (
    <div className={`card p-5 ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
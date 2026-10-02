export default function Card({ title, subtitle, children, actions, className = '' }) {
  return (
    <div className={`card p-3 sm:p-5 ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3 sm:mb-4">
          <div className="min-w-0">
            {title && <h3 className="text-base sm:text-lg font-semibold text-slate-900 break-words">{title}</h3>}
            {subtitle && <p className="text-xs sm:text-sm text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
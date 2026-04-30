export function Card({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur sm:rounded-3xl ${className}`}>
      {(title || subtitle || action) && (
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="font-display text-lg font-semibold text-slate-900">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
        </div>
      )}
      <div className="min-w-0 p-4 sm:p-5">{children}</div>
    </section>
  );
}

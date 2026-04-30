export function InputField({ label, className = "", ...props }) {
  return (
    <label className="block min-w-0 space-y-2">
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
      <input
        className={`min-h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-ink-400 focus:ring-4 focus:ring-ink-100 ${className}`}
        {...props}
      />
    </label>
  );
}

export function SelectField({ label, children, className = "", ...props }) {
  return (
    <label className="block min-w-0 space-y-2">
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
      <select
        className={`min-h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-ink-400 focus:ring-4 focus:ring-ink-100 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function TextareaField({ label, className = "", ...props }) {
  return (
    <label className="block min-w-0 space-y-2">
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
      <textarea
        className={`min-h-28 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-ink-400 focus:ring-4 focus:ring-ink-100 ${className}`}
        {...props}
      />
    </label>
  );
}

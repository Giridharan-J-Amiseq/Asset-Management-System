export function StatsGrid({ stats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <article key={stat.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">{stat.label}</div>
          <div className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-900">{stat.value}</div>
          {stat.helper && <div className="mt-2 text-sm text-slate-500">{stat.helper}</div>}
        </article>
      ))}
    </div>
  );
}
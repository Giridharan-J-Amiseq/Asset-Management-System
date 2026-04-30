import { Badge } from "./Badge";

function defaultRowKey(row, index) {
  const stableId = row.transaction_id || row.maintenance_id || row.asset_id || row.user_id || row.id;
  return stableId ? `${stableId}-${index}` : `row-${index}`;
}

export function DataTable({ columns, rows, emptyMessage = "No records found.", getRowKey = defaultRowKey }) {
  if (!rows || rows.length === 0) {
    return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">{emptyMessage}</div>;
  }

  return (
    <div className="min-w-0">
      <div className="space-y-3 md:hidden">
        {rows.map((row, index) => (
          <article key={getRowKey(row, index)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-3">
              {columns.map((column) => {
                const value = column.render ? column.render(row) : row[column.key];
                return (
                  <div key={column.key} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 text-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{column.label}</div>
                    <div className="min-w-0 break-words text-slate-800">
                      {column.badge ? <Badge tone={value}>{value}</Badge> : value ?? "-"}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="whitespace-nowrap px-4 py-3 font-semibold uppercase tracking-[0.12em]">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={getRowKey(row, index)} className="hover:bg-slate-50/80">
                {columns.map((column) => {
                  const value = column.render ? column.render(row) : row[column.key];
                  return (
                    <td key={column.key} className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {column.badge ? <Badge tone={value}>{value}</Badge> : value ?? "-"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

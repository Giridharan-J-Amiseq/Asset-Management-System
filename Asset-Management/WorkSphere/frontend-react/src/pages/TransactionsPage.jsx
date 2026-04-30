import { useEffect, useState } from "react";

import { api } from "../services/api";
import { formatDateTime } from "../services/formatters";
import { Card } from "../components/Card";
import { DataTable } from "../components/DataTable";
import { Layout } from "../components/Layout";

export function TransactionsPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/transactions")
      .then(setRows)
      .catch((requestError) => setError(requestError.message));
  }, []);

  return (
    <Layout title="Asset Transaction" subtitle="Asset movement history across the organization.">
      <Card>
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : (
          <DataTable
            columns={[
              { key: "asset_name", label: "Asset" },
              { key: "transaction_type", label: "Type" },
              { key: "from_employee_name", label: "From" },
              { key: "to_assignee_name", label: "To" },
              { key: "action_date", label: "Date", render: (row) => formatDateTime(row.action_date) },
            ]}
            rows={rows}
            getRowKey={(row) => `transaction-${row.transaction_id}`}
          />
        )}
      </Card>
    </Layout>
  );
}

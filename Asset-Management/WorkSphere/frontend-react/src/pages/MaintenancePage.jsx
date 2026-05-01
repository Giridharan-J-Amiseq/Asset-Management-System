import { useEffect, useState } from "react";

import { maintenanceIssueTypes } from "../app/routeConfig";
import { api } from "../services/api";
import { formatDateTime } from "../services/formatters";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { SelectField, TextareaField, InputField } from "../components/FormField";
import { Layout } from "../components/Layout";
import { DataTable } from "../components/DataTable";

export function MaintenancePage() {
  const [assets, setAssets] = useState([]);
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({ asset_id: "", issue_type: "", issue_description: "", vendor: "", resolution_notes: "", warranty_applicable: false });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadMaintenanceData = async () => {
    const [assetResponse, maintenanceResponse] = await Promise.all([
      api.get("/assets?status_filter=Assigned&page_size=100"),
      api.get("/maintenance"),
    ]);
    setAssets(assetResponse.items || []);
    setRecords(maintenanceResponse || []);
  };

  useEffect(() => {
    loadMaintenanceData().catch((requestError) => setError(requestError.message));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      await api.post("/maintenance", {
        asset_id: Number(form.asset_id),
        issue_type: form.issue_type,
        issue_description: form.issue_description,
        vendor: form.vendor || null,
        resolution_notes: form.resolution_notes || null,
        warranty_applicable: Boolean(form.warranty_applicable),
      });
      setMessage("Maintenance issue logged successfully.");
      setForm({ asset_id: "", issue_type: "", issue_description: "", vendor: "", resolution_notes: "", warranty_applicable: false });
      await loadMaintenanceData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const closeMaintenance = async (maintenanceId) => {
    if (!window.confirm("Close this maintenance record and mark the asset available?")) return;
    setMessage("");
    setError("");

    try {
      const result = await api.patch(`/maintenance/${maintenanceId}/close`);
      setMessage(result.message || "Maintenance closed and asset marked available.");
      await loadMaintenanceData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <Layout title="Maintenance" subtitle="Log and close repair records with an auditable workflow.">
      <div className="grid gap-6 2xl:grid-cols-[0.9fr_1.1fr]">
        <Card title="Log maintenance issue" subtitle="Use this form when an asset needs attention.">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <SelectField label="Asset" value={form.asset_id} onChange={(event) => setForm({ ...form, asset_id: event.target.value })} required>
              <option value="">Select asset</option>
              {assets.map((asset) => <option key={asset.asset_id} value={asset.asset_id}>{asset.asset_name} - {asset.serial_number}</option>)}
            </SelectField>
            <SelectField label="Issue type" value={form.issue_type} onChange={(event) => setForm({ ...form, issue_type: event.target.value })} required>
              <option value="">Select issue type</option>
              {maintenanceIssueTypes.map((item) => <option key={item} value={item}>{item}</option>)}
            </SelectField>
            <TextareaField label="Issue description" value={form.issue_description} onChange={(event) => setForm({ ...form, issue_description: event.target.value })} />
            <InputField label="Vendor" value={form.vendor} onChange={(event) => setForm({ ...form, vendor: event.target.value })} />
            <TextareaField label="Resolution notes" value={form.resolution_notes} onChange={(event) => setForm({ ...form, resolution_notes: event.target.value })} />

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input type="checkbox" checked={form.warranty_applicable} onChange={(event) => setForm({ ...form, warranty_applicable: event.target.checked })} />
              Warranty applicable
            </label>

            <Button type="submit" className="w-full">Log issue</Button>
          </form>

          {message && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
          {error && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        </Card>

        <Card title="Maintenance records" subtitle="Recent maintenance work in the system.">
          <DataTable
            columns={[
              { key: "asset_name", label: "Asset" },
              { key: "issue_type", label: "Issue" },
              { key: "asset_status", label: "Asset status", badge: true },
              { key: "maintenance_status", label: "Status", render: (row) => <Badge tone={row.maintenance_status}>{row.maintenance_status}</Badge> },
              { key: "created_on", label: "Created", render: (row) => formatDateTime(row.created_on) },
              {
                key: "maintenance_id",
                label: "Action",
                render: (row) => row.maintenance_status === "Closed" ? (
                  "-"
                ) : (
                  <Button variant="secondary" onClick={() => closeMaintenance(row.maintenance_id)}>
                    Close repair
                  </Button>
                ),
              },
            ]}
            rows={records}
          />
        </Card>
      </div>
    </Layout>
  );
}

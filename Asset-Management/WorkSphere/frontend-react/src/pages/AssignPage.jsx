import { useEffect, useState } from "react";

import { api } from "../services/api";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { SelectField, TextareaField } from "../components/FormField";
import { Layout } from "../components/Layout";

export function AssignPage() {
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ asset_id: "", to_assignee: "", remarks: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/assets?status_filter=Available&page_size=100"), api.get("/users/assignable")])
      .then(([assetResponse, userResponse]) => {
        setAssets(assetResponse.items || []);
        setUsers(userResponse || []);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const result = await api.post("/transactions/assign", {
        asset_id: Number(form.asset_id),
        to_assignee: Number(form.to_assignee),
        remarks: form.remarks || null,
      });
      setMessage(result.message);
      setForm({ asset_id: "", to_assignee: "", remarks: "" });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <Layout title="Assign asset" subtitle="Assign an available asset to an active user.">
      <Card>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <SelectField label="Asset" value={form.asset_id} onChange={(event) => setForm({ ...form, asset_id: event.target.value })} required>
            <option value="">Select asset</option>
            {assets.map((asset) => <option key={asset.asset_id} value={asset.asset_id}>{asset.asset_name} - {asset.serial_number}</option>)}
          </SelectField>
          <SelectField label="Assignee" value={form.to_assignee} onChange={(event) => setForm({ ...form, to_assignee: event.target.value })} required>
            <option value="">Select user</option>
            {users.map((user) => <option key={user.user_id} value={user.user_id}>{user.user_name} ({user.role})</option>)}
          </SelectField>
          <TextareaField className="md:col-span-2" label="Remarks" value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} />
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit">Assign asset</Button>
          </div>
        </form>

        {message && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
        {error && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      </Card>
    </Layout>
  );
}
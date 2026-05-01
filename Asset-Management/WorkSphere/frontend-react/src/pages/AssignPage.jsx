import { useEffect, useState } from "react";

import { api } from "../services/api";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { InputField, SelectField, TextareaField } from "../components/FormField";
import { Layout } from "../components/Layout";

export function AssignPage() {
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ asset_id: "", to_assignee: "", remarks: "" });
  const [assetQuery, setAssetQuery] = useState("");
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/users/assignable")
      .then((userResponse) => setUsers(userResponse || []))
      .catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const trimmed = assetQuery.trim();

    const timer = setTimeout(() => {
      const params = new URLSearchParams({ status_filter: "Available", page_size: "100" });
      if (trimmed) params.set("search", trimmed);
      api
        .get(`/assets?${params.toString()}`)
        .then((assetResponse) => {
          if (cancelled) return;
          setAssets(assetResponse.items || []);
        })
        .catch((requestError) => {
          if (cancelled) return;
          setError(requestError.message);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [assetQuery]);

  const normalizedAssetQuery = assetQuery.trim().toLowerCase();
  const normalizedAssigneeQuery = assigneeQuery.trim().toLowerCase();

  const filteredAssets = normalizedAssetQuery
    ? assets.filter((asset) => {
      const haystack = `${asset.asset_id ?? ""} ${asset.asset_name ?? ""} ${asset.serial_number ?? ""}`.toLowerCase();
      return haystack.includes(normalizedAssetQuery);
    })
    : assets;

  const filteredUsers = normalizedAssigneeQuery
    ? users.filter((user) => `${user.user_name ?? ""}`.toLowerCase().includes(normalizedAssigneeQuery))
    : users;

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
          <InputField
            label="Search asset"
            value={assetQuery}
            onChange={(event) => setAssetQuery(event.target.value)}
            placeholder="Search by asset id, name, or serial number"
          />
          <InputField
            label="Search assignee"
            value={assigneeQuery}
            onChange={(event) => setAssigneeQuery(event.target.value)}
            placeholder="Search by user name"
          />
          <SelectField label="Asset" value={form.asset_id} onChange={(event) => setForm({ ...form, asset_id: event.target.value })} required>
            <option value="">Select asset</option>
            {filteredAssets.length === 0 ? (
              <option value="" disabled>No matching assets</option>
            ) : (
              filteredAssets.map((asset) => (
                <option key={asset.asset_id} value={asset.asset_id}>
                  {asset.asset_name} - {asset.serial_number}
                </option>
              ))
            )}
          </SelectField>
          <SelectField label="Assignee" value={form.to_assignee} onChange={(event) => setForm({ ...form, to_assignee: event.target.value })} required>
            <option value="">Select user</option>
            {filteredUsers.length === 0 ? (
              <option value="" disabled>No matching users</option>
            ) : (
              filteredUsers.map((user) => (
                <option key={user.user_id} value={user.user_id}>
                  {user.user_name} ({user.role})
                </option>
              ))
            )}
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
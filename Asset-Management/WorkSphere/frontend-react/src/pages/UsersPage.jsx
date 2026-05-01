import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../services/api";
import { userRoles } from "../app/routeConfig";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { InputField, SelectField } from "../components/FormField";
import { Layout } from "../components/Layout";
import { DataTable } from "../components/DataTable";
import { ConfirmButton } from "../components/ConfirmButton";

const emptyForm = { user_name: "", username: "", email: "", password: "", role: "Viewer" };

export function UsersPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const loadUsers = async () => {
    const response = await api.get("/users");
    setRows(response || []);
  };

  useEffect(() => {
    loadUsers().catch((requestError) => setError(requestError.message));
  }, []);

  const syncMicrosoftUsers = async () => {
    setError("");
    setMessage("");
    setIsSyncing(true);

    try {
      const result = await api.post("/auth/microsoft/import-users?top=200", {});
      const imported = result?.imported ?? 0;
      const skipped = result?.skipped ?? 0;
      setMessage(`Microsoft import complete. Imported ${imported}, skipped ${skipped}.`);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      await api.post("/users", form);
      setForm(emptyForm);
      setMessage("User created successfully.");
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const deactivateUser = async (userId) => {
    try {
      await api.patch(`/users/${userId}/deactivate`);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <Layout title="Users" subtitle="Create and manage application access for your team.">
      <div className="grid gap-6 2xl:grid-cols-[0.9fr_1.1fr]">
        <Card title="Create user" subtitle="Admin-only user management form.">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <InputField label="Full name" value={form.user_name} onChange={(event) => setForm({ ...form, user_name: event.target.value })} required />
            <InputField label="Username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required />
            <InputField label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            <InputField label="Password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
            <SelectField label="Role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              {userRoles.map((role) => <option key={role} value={role}>{role}</option>)}
            </SelectField>
            <Button type="submit" className="w-full">Create user</Button>
          </form>

          {message && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
          {error && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        </Card>

        <Card title="User directory" subtitle="Active and inactive accounts.">
          <div className="mb-4 flex justify-end">
            <Button type="button" onClick={syncMicrosoftUsers} disabled={isSyncing}>
              {isSyncing ? "Syncing..." : "Sync from Microsoft"}
            </Button>
          </div>
          <DataTable
            columns={[
              {
                key: "user_name",
                label: "Name",
                render: (row) => (
                  <Link className="font-medium text-slate-900 hover:underline" to={`/users/${row.user_id}`}>
                    {row.user_name}
                  </Link>
                ),
              },
              { key: "username", label: "Username" },
              { key: "role", label: "Role" },
              { key: "is_active", label: "Status", render: (row) => (row.is_active ? "Active" : "Inactive") },
              {
                key: "user_id",
                label: "Action",
                render: (row) => (
                  row.is_active ? (
                    <ConfirmButton confirmText="Deactivate this user and return assigned assets to Available?" danger onConfirm={() => deactivateUser(row.user_id)}>
                      Deactivate
                    </ConfirmButton>
                  ) : (
                    "-"
                  )
                ),
              },
            ]}
            rows={rows}
          />
        </Card>
      </div>
    </Layout>
  );
}

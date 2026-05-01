import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { API_BASE_URL, api } from "../services/api";
import { formatCurrency, formatDate, formatDateTime } from "../services/formatters";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DataTable } from "../components/DataTable";
import { InputField, SelectField, TextareaField } from "../components/FormField";
import { Layout } from "../components/Layout";
import { assetConditions } from "../app/routeConfig";

export function AssetDetailPage() {
  const { assetId } = useParams();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ asset_name: "", department: "", location: "", condition_status: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    async function loadAsset() {
      setLoading(true);
      try {
        const response = await api.get(`/assets/${assetId}`);
        if (!mounted) return;
        setData(response);
        setForm({
          asset_name: response.asset.asset_name || "",
          department: response.asset.department || "",
          location: response.asset.location || "",
          condition_status: response.asset.condition_status || "New",
        });
      } catch (requestError) {
        if (mounted) setError(requestError.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAsset();
    return () => {
      mounted = false;
    };
  }, [assetId]);

  const asset = data?.asset;
  const activity = data?.activity || [];
  const latestTransaction = data?.transactions?.[0] || null;
  const currentHolder =
    asset?.asset_status === "Assigned"
      ? {
          userId: latestTransaction?.to_assignee,
          name: latestTransaction?.to_assignee_name,
          assignedOn: latestTransaction?.action_date,
          performedByName: latestTransaction?.performed_by_name,
        }
      : null;

  const saveAsset = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      await api.put(`/assets/${assetId}`, form);
      setMessage("Asset updated successfully.");
      const updated = await api.get(`/assets/${assetId}`);
      setData(updated);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handlePrintQr = () => {
    const printableId = asset?.formatted_asset_id || asset?.asset_code || assetId;
    if (!asset?.qr_code_image_url) {
      navigate(`/qr-print?assetId=${encodeURIComponent(printableId)}`);
      return;
    }

    // Use in-page printing to avoid popup blockers.
    window.print();
  };

  const retireAsset = async () => {
    if (!window.confirm("Retire this asset?")) return;
    try {
      await api.patch(`/assets/${assetId}/retire`);
      navigate("/assets");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <Layout title="Asset detail" subtitle="Detailed record, QR code, transactions, and maintenance history.">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .asset-print-label, .asset-print-label * { visibility: visible !important; }
          .asset-print-label {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 16px !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            background: #fff !important;
          }
        }
      `}</style>
      {loading ? (
        <Card>
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-72 rounded-xl bg-slate-200" />
            <div className="h-40 rounded-3xl bg-slate-100" />
          </div>
        </Card>
      ) : error ? (
        <Card>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          <div className="mt-4">
            <Button as={Link} to="/assets" variant="secondary">Back to assets</Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {asset?.qr_code_image_url && (
            <div className="asset-print-label" aria-hidden="true">
              <div
                style={{
                  border: "2px solid #000",
                  padding: "18px 22px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "24px",
                }}
              >
                <div style={{ display: "grid", gap: "8px" }}>
                  <div style={{ fontSize: "16px", lineHeight: 1.2, fontWeight: 800 }}>
                    Asset ID:<span style={{ fontWeight: 700, marginLeft: 6 }}>{asset.formatted_asset_id || asset.asset_code || "-"}</span>
                  </div>
                  <div style={{ fontSize: "16px", lineHeight: 1.2 }}>
                    <strong>Asset Name:</strong> {asset.asset_name || "-"}
                  </div>
                  <div style={{ fontSize: "14px", lineHeight: 1.2 }}>
                    <strong>S/N:</strong> {asset.serial_number || "-"}
                  </div>
                </div>
                <img
                  src={`${API_BASE_URL}${asset.qr_code_image_url}`}
                  alt="Asset QR"
                  style={{ width: 150, height: 150, objectFit: "contain" }}
                />
              </div>
            </div>
          )}

          <div className="grid min-w-0 gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
            <Card
              title={asset.asset_name}
              subtitle={`Asset ID ${asset.formatted_asset_id || asset.asset_code || `Asset #${asset.asset_id}`} - ${asset.serial_number}`}
              action={<Badge tone={asset.asset_status}>{asset.asset_status}</Badge>}
            >
              <div className="grid min-w-0 gap-6 lg:grid-cols-2">
                <div className="space-y-3 text-sm text-slate-700">
                  <InfoRow label="Asset ID" value={asset.formatted_asset_id || asset.asset_code || "-"} />
                  <InfoRow label="Asset count" value={asset.asset_count || asset.asset_id} />
                  <InfoRow
                    label="Currently with"
                    value={
                      currentHolder?.name ? (
                        <Link className="font-semibold text-slate-900 hover:underline" to={`/users/${currentHolder.userId}`}>
                          {currentHolder.name}
                        </Link>
                      ) : (
                        "Not assigned"
                      )
                    }
                  />
                  <InfoRow label="Assigned on" value={currentHolder?.assignedOn ? formatDateTime(currentHolder.assignedOn) : "-"} />
                  <InfoRow label="Asset type" value={asset.asset_type} />
                  <InfoRow label="Category" value={asset.category} />
                  <InfoRow label="Condition" value={asset.condition_status} />
                  <InfoRow label="Location" value={asset.location || "-"} />
                  <InfoRow label="Department" value={asset.department || "-"} />
                  <InfoRow label="Brand" value={asset.brand || "-"} />
                  <InfoRow label="Model" value={asset.model || "-"} />
                  <InfoRow label="Purchase date" value={formatDate(asset.purchase_date)} />
                  <InfoRow label="Purchase cost" value={formatCurrency(asset.purchase_cost)} />
                </div>

                <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:rounded-3xl sm:p-5">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">QR code</div>
                  <div className="mt-4 flex min-h-56 items-center justify-center rounded-2xl bg-white p-4 sm:min-h-64 sm:rounded-3xl sm:p-6">
                    {asset.qr_code_image_url ? (
                      <img className="max-h-52 w-full max-w-52 object-contain sm:max-h-56 sm:max-w-56" src={`${API_BASE_URL}${asset.qr_code_image_url}`} alt="Asset QR code" />
                    ) : (
                      <div className="text-sm text-slate-500">No QR code generated yet.</div>
                    )}
                  </div>
                  <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                    <Button onClick={handlePrintQr}>Print QR</Button>
                    <Button as="a" href={`${asset.qr_code_image_url ? `${API_BASE_URL}${asset.qr_code_image_url}` : "#"}`} variant="secondary" target="_blank" rel="noreferrer">
                      Open image
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:rounded-3xl sm:p-5">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Specifications</div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{asset.specifications || "No specifications provided."}</p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm sm:rounded-3xl">
                  <div className="text-slate-500">Created on</div>
                  <div className="mt-1 font-semibold">{formatDateTime(asset.created_on)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm sm:rounded-3xl">
                  <div className="text-slate-500">Modified on</div>
                  <div className="mt-1 font-semibold">{formatDateTime(asset.modified_on)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm sm:rounded-3xl">
                  <div className="text-slate-500">Retired</div>
                  <div className="mt-1 font-semibold">{asset.is_retired ? "Yes" : "No"}</div>
                </div>
              </div>

              {message && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap">
                <Button as={Link} to="/assets" variant="secondary">Back</Button>
                <Button as={Link} to="/assign" variant="secondary">Assign</Button>
                <Button as={Link} to="/transfer" variant="secondary">Transfer</Button>
                <Button as={Link} to="/maintenance" variant="secondary">Maintenance</Button>
                <Button variant="danger" onClick={retireAsset}>Retire</Button>
              </div>
            </Card>

            <div className="space-y-6">
              <Card title="Edit asset" subtitle="Keep the core asset record up to date.">
                <form className="space-y-4" onSubmit={saveAsset}>
                  <InputField label="Asset name" value={form.asset_name} onChange={(event) => setForm({ ...form, asset_name: event.target.value })} />
                  <InputField label="Department" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} />
                  <InputField label="Location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
                  <SelectField label="Condition" value={form.condition_status} onChange={(event) => setForm({ ...form, condition_status: event.target.value })}>
                    {assetConditions.map((item) => <option key={item} value={item}>{item}</option>)}
                  </SelectField>
                  <Button type="submit" className="w-full">Save changes</Button>
                </form>
              </Card>

              <Card title="Related activity" subtitle="The asset history stays visible for audit and support. ">
                <div className="space-y-3 text-sm text-slate-700">
                  <p><span className="font-semibold">Transactions:</span> {data.transactions.length}</p>
                  <p><span className="font-semibold">Maintenance records:</span> {data.maintenance.length}</p>
                  <p><span className="font-semibold">QR asset ID:</span> {asset.formatted_asset_id || asset.asset_code || "Not generated"}</p>
                  <p><span className="font-semibold">Asset count:</span> {asset.asset_count || asset.asset_id}</p>
                </div>
              </Card>
            </div>
          </div>

          <Card title="Transaction log" subtitle="Assignment and transfer history for this asset.">
            <DataTable
              columns={[
                { key: "transaction_type", label: "Action", badge: true },
                { key: "from_employee_name", label: "From", render: (row) => row.from_employee_name || "-" },
                { key: "to_assignee_name", label: "To", render: (row) => row.to_assignee_name || "-" },
                { key: "performed_by_name", label: "Performed by", render: (row) => row.performed_by_name || "-" },
                { key: "action_date", label: "Date", render: (row) => formatDateTime(row.action_date) },
                { key: "remarks", label: "Remarks", render: (row) => row.remarks || "-" },
              ]}
              rows={data.transactions}
              emptyMessage="No transactions recorded for this asset yet."
              getRowKey={(row) => `asset-transaction-${row.transaction_id}`}
            />
          </Card>

          <Card title="Maintenance log" subtitle="Repair, damage, warranty, and resolution history for this asset.">
            <DataTable
              columns={[
                { key: "issue_type", label: "Issue" },
                { key: "maintenance_status", label: "Status", render: (row) => <Badge tone={row.maintenance_status}>{row.maintenance_status}</Badge> },
                { key: "warranty_applicable", label: "Warranty", render: (row) => (row.warranty_applicable ? "Yes" : "No") },
                { key: "vendor", label: "Vendor", render: (row) => row.vendor || "-" },
                { key: "created_on", label: "Created", render: (row) => formatDateTime(row.created_on) },
                { key: "modified_on", label: "Modified", render: (row) => formatDateTime(row.modified_on) },
              ]}
              rows={data.maintenance}
              emptyMessage="No maintenance records logged for this asset yet."
              getRowKey={(row) => `asset-maintenance-${row.maintenance_id}`}
            />
          </Card>

          <Card title="Change log" subtitle="Recorded updates and status changes for this asset.">
            <DataTable
              columns={[
                { key: "action", label: "Action" },
                { key: "performed_by_name", label: "Performed by", render: (row) => row.performed_by_name || "-" },
                { key: "created_on", label: "Date", render: (row) => formatDateTime(row.created_on) },
                {
                  key: "details",
                  label: "Details",
                  render: (row) => (
                    <span className="block max-w-[28rem] truncate text-slate-600" title={row.details || ""}>
                      {formatActivityDetails(row.details)}
                    </span>
                  ),
                },
              ]}
              rows={activity}
              emptyMessage="No change log entries recorded yet."
              getRowKey={(row) => `asset-activity-${row.log_id}`}
            />
          </Card>

          <Card title="Asset audit details" subtitle="Full record values useful for audit checks.">
            <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <AuditField label="Asset ID" value={asset.formatted_asset_id || asset.asset_code} />
              <AuditField label="Asset count" value={asset.asset_count || asset.asset_id} />
              <AuditField label="Internal database id" value={asset.asset_id} />
              <AuditField label="Serial number" value={asset.serial_number} />
              <AuditField label="Invoice number" value={asset.invoice_number} />
              <AuditField label="Vendor name" value={asset.vendor_name} />
              <AuditField label="Warranty start" value={formatDate(asset.warranty_start_date)} />
              <AuditField label="Warranty expiry" value={asset.warranty_expiry !== null && asset.warranty_expiry !== undefined ? `${asset.warranty_expiry} year(s)` : "-"} />
              <AuditField label="QR image" value={asset.qr_code_image_url || "-"} />
              <AuditField label="QR value" value={asset.qr_code_value ?? "-"} />
              <AuditField label="Created by user id" value={asset.created_by ?? "-"} />
              <AuditField label="Modified by user id" value={asset.modified_by ?? "-"} />
              <AuditField label="Created on" value={formatDateTime(asset.created_on)} />
              <AuditField label="Modified on" value={formatDateTime(asset.modified_on)} />
              <AuditField label="Retired" value={asset.is_retired ? "Yes" : "No"} />
            </div>
          </Card>
        </div>
      )}
    </Layout>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 border-b border-slate-200 py-2 text-sm last:border-b-0 sm:flex sm:items-start sm:justify-between sm:gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="min-w-0 break-words font-semibold text-slate-900 sm:text-right">{value}</span>
    </div>
  );
}

function AuditField({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
      <div className="text-slate-500">{label}</div>
      <div className="mt-1 break-words font-semibold text-slate-900">{value || "-"}</div>
    </div>
  );
}

function formatActivityDetails(value) {
  if (!value) return "-";

  try {
    const parsed = JSON.parse(value);
    if (parsed?.changes && typeof parsed.changes === "object") {
      const keys = Object.keys(parsed.changes);
      return keys.length ? `Updated: ${keys.join(", ")}` : "Updated";
    }
    return typeof parsed === "string" ? parsed : JSON.stringify(parsed);
  } catch {
    return String(value);
  }
}

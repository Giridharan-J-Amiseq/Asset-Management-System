import { useEffect, useMemo, useState } from "react";

import { API_BASE_URL, api } from "../services/api";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Layout } from "../components/Layout";

export function QrPrintPage() {
  const [assets, setAssets] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const selectedAssets = useMemo(() => {
    const selectedIds = selected;
    return assets.filter((asset) => selectedIds.has(asset.asset_id) && asset.qr_code_image_url);
  }, [assets, selected]);

  const handlePrint = () => {
    if (!selectedAssets.length) {
      setError("Select at least one asset QR label to print.");
      return;
    }
    setError("");
    window.print();
  };

  useEffect(() => {
    let mounted = true;

    async function loadAllAssets() {
      setLoading(true);
      setError("");
      try {
        const pageSize = 100;
        let page = 1;
        let total = 0;
        const all = [];

        // Page through assets so we can render all QR labels.
        // Endpoint already returns non-retired assets.
        while (true) {
          const response = await api.get(`/assets?page=${page}&page_size=${pageSize}`);
          const items = Array.isArray(response?.items) ? response.items : [];
          total = Number(response?.total || 0);
          all.push(...items);
          if (all.length >= total || items.length === 0) break;
          page += 1;
        }

        if (!mounted) return;
        setAssets(all);
      } catch (requestError) {
        if (mounted) setError(requestError.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAllAssets();
    return () => {
      mounted = false;
    };
  }, []);

  const toggleAsset = (asset) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(asset.asset_id)) {
        next.delete(asset.asset_id);
      } else {
        next.add(asset.asset_id);
      }
      return next;
    });
  };

  return (
    <Layout title="QR print" subtitle="Select asset QR labels to print.">
      <style>{`
        .qr-bulk-print-area { display: none; }

        @media print {
          body * { visibility: hidden !important; }
          .qr-bulk-print-area, .qr-bulk-print-area * { visibility: visible !important; }
          .qr-bulk-print-area { display: block; position: absolute; left: 0; top: 0; width: 100%; padding: 16px; box-sizing: border-box; background: #fff; }
          .qr-label { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="space-y-6">
        <Card title="Print QR labels" subtitle="Check the assets you want to print.">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-600">
              {loading ? "Loading assets..." : `${assets.length} assets loaded`}
            </div>
            <Button onClick={handlePrint} disabled={!selectedAssets.length}>Print selected</Button>
          </div>
          {error && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

          {loading ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />
              <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />
            </div>
          ) : assets.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {assets.map((asset) => {
                const hasQr = Boolean(asset.qr_code_image_url);
                const isChecked = selected.has(asset.asset_id);

                return (
                  <div key={`qr-label-${asset.asset_id}`} className="rounded-3xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-2 h-4 w-4 rounded border-slate-300"
                        checked={isChecked}
                        disabled={!hasQr}
                        onChange={() => toggleAsset(asset)}
                        aria-label={`Select ${asset.formatted_asset_id || asset.asset_code || asset.asset_id}`}
                      />
                      <div className={`w-full rounded-2xl border-2 border-black bg-white p-4 ${!hasQr ? "opacity-60" : ""}`}>
                        <div className="flex items-center justify-between gap-6">
                          <div className="space-y-2">
                            <div className="text-base font-extrabold text-slate-900">
                              Asset ID:{asset.formatted_asset_id || asset.asset_code || "-"}
                            </div>
                            <div className="text-sm text-slate-900">
                              <span className="font-semibold">Asset Name:</span> {asset.asset_name || "-"}
                            </div>
                            <div className="text-sm text-slate-700">
                              <span className="font-semibold">S/N:</span> {asset.serial_number || "-"}
                            </div>
                            {!hasQr && <div className="text-xs text-rose-600">No QR generated for this asset.</div>}
                          </div>
                          {hasQr ? (
                            <img
                              className="h-28 w-28 object-contain"
                              src={`${API_BASE_URL}${asset.qr_code_image_url}`}
                              alt="Asset QR code"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-28 w-28 rounded-2xl border border-dashed border-slate-200 bg-slate-50" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              No assets found.
            </div>
          )}
        </Card>

        <div className="qr-bulk-print-area" aria-hidden="true">
          <div className="space-y-4">
            {selectedAssets.map((asset) => (
              <div
                key={`print-label-${asset.asset_id}`}
                className="qr-label"
                style={{ border: "2px solid #000", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px" }}
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
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

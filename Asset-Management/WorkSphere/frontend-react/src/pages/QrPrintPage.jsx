import { useState } from "react";

import { API_BASE_URL, api } from "../services/api";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { InputField } from "../components/FormField";
import { Layout } from "../components/Layout";

export function QrPrintPage() {
  const [assetId, setAssetId] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const response = await api.post(`/assets/${assetId}/qr`, {});
      setResult(response);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <Layout title="QR print" subtitle="Generate, review, and print an asset QR code.">
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card title="Generate QR" subtitle="Enter the formatted asset ID or internal asset count to create a QR image.">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <InputField label="Asset ID" value={assetId} onChange={(event) => setAssetId(event.target.value)} placeholder="AMQ-CHE-PHO-36889-FY or 21" required />
            <Button type="submit" className="w-full">Generate QR</Button>
          </form>
          {error && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        </Card>

        <Card title="Preview" subtitle="Print-ready QR output appears here.">
          {result ? (
            <div className="space-y-4 text-center">
              <img className="mx-auto w-full max-w-64 rounded-2xl border border-slate-200 bg-white p-4 sm:max-w-xs sm:rounded-3xl" src={`${API_BASE_URL}${result.qr_code_image_url}`} alt="Asset QR code" />
              <div className="font-semibold text-slate-700">Asset ID: {result.formatted_asset_id}</div>
              <div className="text-sm text-slate-500">Asset count: {result.asset_count}</div>
              {result.qr_payload && (
                <pre className="mx-auto max-w-md whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-xs leading-6 text-slate-600">
                  {result.qr_payload}
                </pre>
              )}
              <div className="grid gap-3 sm:flex sm:justify-center">
                <Button variant="secondary" onClick={() => window.print()}>Print QR</Button>
                <Button as="a" href={`${API_BASE_URL}${result.qr_code_image_url}`} target="_blank" rel="noreferrer" variant="secondary">
                  Open image
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">Generate a QR code to see the preview.</div>
          )}
        </Card>
      </div>
    </Layout>
  );
}

import { textileService } from "@/services/textile.service";
import { gate } from "../gate";
import { ActionForm } from "../action-form";
import { registerYarnAction } from "../actions";
import { Card, F, Title, fmt, inputCls, td, th } from "../ui";

export default async function YarnPage() {
  await gate();
  const [rows, opt] = await Promise.all([textileService.listYarn(), textileService.options()]);
  const used = new Set(rows.map((r) => r.lotId));
  return (
    <div>
      <Title>Yarn</Title>
      <Card title="Register yarn details for a received lot">
        <p className="mb-3 text-xs text-gray-500">
          Receive yarn through a normal GRN with a lot number (material category YARN), then add count and composition here.
        </p>
        <ActionForm action={registerYarnAction} submitLabel="Register yarn" className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <F label="Yarn lot">
            <select name="lotId" required className={inputCls}>
              <option value="">Select lot</option>
              {opt.lots.filter((l) => !used.has(l.id)).map((l) => (
                <option key={l.id} value={l.id}>{l.material.code} / {l.lotNo}</option>
              ))}
            </select>
          </F>
          <F label="Yarn type"><input name="yarnType" required className={inputCls} placeholder="Combed cotton" /></F>
          <F label="Count"><input name="yarnCount" required className={inputCls} placeholder="30/1" /></F>
          <F label="Composition"><input name="composition" className={inputCls} placeholder="100% cotton" /></F>
          <F label="Color"><input name="color" className={inputCls} /></F>
          <F label="Rate"><input name="rate" type="number" step="0.0001" className={inputCls} /></F>
          <F label="Currency"><input name="currency" defaultValue="BDT" maxLength={3} className={inputCls} /></F>
        </ActionForm>
      </Card>
      <Card>
        <table className="w-full">
          <thead><tr><th className={th}>Lot</th><th className={th}>Material</th><th className={th}>Type</th><th className={th}>Count</th><th className={th}>Composition</th><th className={th}>Color</th><th className={th}>Received qty</th><th className={th}>Rate</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className={td}>{r.lotNo}</td><td className={td}>{r.materialCode}</td><td className={td}>{r.yarnType}</td>
                <td className={td}>{r.yarnCount}</td><td className={td}>{r.composition ?? "-"}</td><td className={td}>{r.color ?? "-"}</td>
                <td className={td}>{fmt(r.qty)}</td><td className={td}>{r.rate ? `${fmt(r.rate)} ${r.currency}` : "-"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className={td} colSpan={8}>No yarn registered yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
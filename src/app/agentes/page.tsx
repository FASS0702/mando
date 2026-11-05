import { Shell, Card, Dot, fmtTime } from "@/components/Shell";
import { getDashboard } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Agentes() {
  const d = await getDashboard();
  return (
    <Shell current="/agentes">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Agentes</h1>
        <p className="text-sm text-muted">Registro único. Un agente nuevo entra como fila aquí, y otro sale.</p>
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-muted">
            <tr>
              <th className="py-1 text-left font-medium">Agente</th>
              <th className="text-left font-medium">Disparo</th>
              <th className="text-left font-medium">Runtime</th>
              <th className="text-left font-medium">Skill</th>
              <th className="text-left font-medium">Última ejecución</th>
              <th className="text-left font-medium">30 días</th>
              <th className="text-left font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {d.agents.map((a) => (
              <tr key={a.id} className="border-t border-line align-top">
                <td className="py-2 pr-3">
                  <div className="text-white">{a.name}</div>
                  <div className="text-[11px] text-muted">{a.description}</div>
                </td>
                <td className="pr-3 text-muted">{a.triggerDesc ?? "bajo demanda"}</td>
                <td className="pr-3 text-muted">{a.runtime}</td>
                <td className="pr-3 font-mono text-xs text-muted">{a.skill ?? "-"}</td>
                <td className="pr-3 font-mono text-xs text-muted">{fmtTime(a.lastRunAt)}</td>
                <td className="pr-3 text-muted">{a.runs30d}</td>
                <td className="py-2">
                  <span className="flex items-center gap-2 text-xs">
                    <Dot tone={a.status !== "active" ? "muted" : a.suggestion ? "warn" : a.lastStatus === "fail" ? "err" : "ok"} />
                    {a.status !== "active" ? a.status : a.suggestion ?? a.lastStatus ?? "sin ejecuciones"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Shell>
  );
}

import Link from "next/link";
import { Shell, Card, Stat, Dot, fmtTime } from "@/components/Shell";
import { ApprovalCard } from "@/components/ApprovalCard";
import { getDashboard } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const d = await getDashboard();
  const active = d.agents.filter((a) => a.status === "active").length;
  const failTone = d.stats24.fail > 0 ? "err" : "ok";

  return (
    <Shell current="/">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Central de Operaciones</h1>
          <p className="text-sm text-muted">Lo que tus agentes hicieron, lo que esperan de ti y dónde corre cada cosa.</p>
        </div>
        <div className="text-xs text-muted">
          {new Date().toLocaleString("es-CL", { timeZone: "America/Santiago", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Agentes activos" value={`${active} / ${d.agents.length}`} sub={`${d.agents.filter((a) => a.suggestion === "sin uso 30 días").length} sin uso en 30 días`} />
        <Stat label="Ejecuciones 24 h" value={String(d.stats24.total)} sub={`${d.stats24.ok} ok · ${d.stats24.fail} con error`} tone={failTone} />
        <Stat label="Pendientes de aprobar" value={String(d.pendingApprovals.length)} sub={d.pendingApprovals.length ? "requieren tu decisión" : "nada pendiente"} tone={d.pendingApprovals.length ? "info" : undefined} />
        <Stat label="Costo del mes" value={d.costMonth.runs ? `US$ ${d.costMonth.usd.toFixed(2)}` : "sin datos"} sub={`${d.costMonth.runs} ejecuciones reportadas`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card title={`Aprobaciones pendientes (${d.pendingApprovals.length})`}>
            {d.pendingApprovals.length === 0 ? (
              <div className="text-sm text-muted">Nada que aprobar. Los agentes publican aquí lo que no pueden hacer solos.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {d.pendingApprovals.map((a) => (
                  <ApprovalCard key={a.id} id={a.id} agentId={a.agentId} kind={a.kind} title={a.title} content={a.content} createdAt={a.createdAt.toISOString()} />
                ))}
              </div>
            )}
          </Card>

          <Card title="Tareas" action={<span className="text-xs text-muted">{d.running} en ejecución · {d.queued} en cola</span>}>
            {d.tasks.length === 0 ? (
              <div className="text-sm text-muted">Sin tareas. Se crean desde un agente, una tarea programada o este tablero.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-muted">
                  <tr><th className="text-left font-medium py-1">Tarea</th><th className="text-left font-medium">Agente</th><th className="text-left font-medium">Origen</th><th className="text-left font-medium">Runtime</th><th className="text-left font-medium">Estado</th></tr>
                </thead>
                <tbody>
                  {d.tasks.slice(0, 10).map((t) => (
                    <tr key={t.id} className="border-t border-line">
                      <td className="py-2 pr-3 text-text">{t.title}</td>
                      <td className="pr-3 text-muted">{t.agentId}</td>
                      <td className="pr-3 text-muted">{t.origin}</td>
                      <td className="pr-3 text-muted">{t.runtime}</td>
                      <td className="flex items-center gap-2 py-2">
                        <Dot tone={t.status === "done" ? "ok" : t.status === "failed" ? "err" : t.status === "running" ? "info" : "muted"} />
                        <span className="text-xs">{t.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title="Actividad reciente">
            {d.recentRuns.length === 0 ? (
              <div className="text-sm text-muted">Todavía ningún agente ha reportado. El primero será el briefing de valeria.</div>
            ) : (
              <ul className="flex flex-col gap-2 font-mono text-xs">
                {d.recentRuns.map((r) => (
                  <li key={r.id} className="flex items-start gap-2">
                    <Dot tone={r.status === "ok" ? "ok" : "err"} />
                    <span className="text-muted w-28 shrink-0">{fmtTime(r.finishedAt)}</span>
                    <span className="text-white w-20 shrink-0">{r.agentId}</span>
                    <span className="text-text">{r.summary ?? r.error ?? "(sin resumen)"}</span>
                    <span className="ml-auto text-muted shrink-0">{r.durationS ? `${Number(r.durationS).toFixed(0)} s` : ""}{r.costUsd ? ` · $${Number(r.costUsd).toFixed(2)}` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Ejecución">
            <ul className="flex flex-col gap-2 text-sm">
              {d.workers.map((w) => (
                <li key={w.worker} className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><Dot tone={w.alive ? "ok" : "muted"} />{w.worker}</span>
                  <span className="text-xs text-muted">{w.alive ? "vivo" : `hace ${w.minutesAgo} min`}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-muted">Vivo = latido en los últimos 3 minutos. El Mac se apaga; eso no es un error, las tareas locales esperan en cola.</p>
          </Card>

          <Card title="Agentes" action={<Link href="/agentes" className="text-xs text-info hover:underline">Ver todos</Link>}>
            <ul className="flex flex-col gap-2 text-sm">
              {d.agents.map((a) => (
                <li key={a.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-white">{a.name}</div>
                    <div className="text-[11px] text-muted">{a.triggerDesc ?? "bajo demanda"} · {a.runtime}</div>
                  </div>
                  <span className="text-xs">
                    {a.suggestion ? <span className="text-warn">{a.suggestion}</span> : <span className="flex items-center gap-1"><Dot tone={a.lastStatus === "fail" ? "err" : "ok"} />{a.lastStatus ?? "ok"}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </Shell>
  );
}

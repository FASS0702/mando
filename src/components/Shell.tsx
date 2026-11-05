import Link from "next/link";

const NAV: { href: string; label: string; soon?: boolean }[] = [
  { href: "/", label: "Inicio" },
  { href: "/agentes", label: "Agentes" },
  { href: "/tareas", label: "Tareas", soon: true },
  { href: "/automatizaciones", label: "Automatizaciones", soon: true },
  { href: "/memoria", label: "Memoria", soon: true },
  { href: "/integraciones", label: "Integraciones", soon: true },
  { href: "/registros", label: "Registros", soon: true },
];

export function Shell({ children, current }: { children: React.ReactNode; current: string }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-line bg-panel flex flex-col">
        <div className="px-5 py-5 border-b border-line">
          <div className="flex items-center gap-2">
            <span className="inline-block h-5 w-5 rounded-md bg-accent" aria-hidden="true" />
            <span className="text-lg font-semibold tracking-tight text-white">MANDO</span>
          </div>
          <div className="mt-1 text-[11px] leading-tight text-muted">Central de Operaciones</div>
        </div>
        <nav className="flex flex-col gap-0.5 p-3">
          {NAV.map((n) =>
            n.soon ? (
              <span key={n.href} className="rounded-md px-3 py-2 text-sm text-muted/60 cursor-default">
                {n.label} <span className="text-[10px]">pronto</span>
              </span>
            ) : (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-md px-3 py-2 text-sm ${current === n.href ? "bg-accent/20 text-white" : "text-text hover:bg-panel-2"}`}
              >
                {n.label}
              </Link>
            ),
          )}
        </nav>
        <div className="mt-auto p-4 text-[11px] text-muted leading-relaxed border-t border-line">
          Observa y aprueba. No ejecuta.
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-6 lg:p-8">{children}</main>
    </div>
  );
}

export function Card({ title, children, action }: { title?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-panel p-4">
      {title && (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "ok" | "warn" | "err" | "info" }) {
  const color = tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : tone === "err" ? "text-err" : tone === "info" ? "text-info" : "text-white";
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${color}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function Dot({ tone }: { tone: "ok" | "warn" | "err" | "info" | "muted" }) {
  const bg = { ok: "bg-ok", warn: "bg-warn", err: "bg-err", info: "bg-info", muted: "bg-muted" }[tone];
  return <span className={`inline-block h-2 w-2 rounded-full ${bg}`} aria-hidden="true" />;
}

export function fmtTime(d: Date | string | null | undefined) {
  if (!d) return "-";
  const date = new Date(d);
  return date.toLocaleString("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

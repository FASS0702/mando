"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = { id: string; agentId: string | null; kind: string; title: string; content: string | null; createdAt: string };

export function ApprovalCard({ id, agentId, kind, title, content, createdAt }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function decide(decision: "approved" | "rejected" | "changes") {
    const note = decision === "changes" ? window.prompt("Qué cambios pides") ?? "" : undefined;
    if (decision === "changes" && !note) return;
    start(async () => {
      setError(null);
      const res = await fetch(`/api/approvals/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, note }),
      });
      if (!res.ok) {
        setError(`Error ${res.status}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-accent/40 bg-accent/5 p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-accent">
        <span>{kind}</span>
        <span className="text-muted">· {agentId ?? "?"} · {new Date(createdAt).toLocaleString("es-CL", { timeZone: "America/Santiago" })}</span>
      </div>
      <div className="mt-1 text-sm font-medium text-white">{title}</div>
      {content && (
        <div className="mt-2">
          <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs text-info hover:underline">
            {open ? "Ocultar texto" : "Ver texto completo"}
          </button>
          {open && <pre className="mt-2 whitespace-pre-wrap rounded-md bg-bg p-3 text-xs leading-relaxed text-text">{content}</pre>}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={pending} onClick={() => decide("approved")} className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50 min-h-9">
          Aprobar
        </button>
        <button type="button" disabled={pending} onClick={() => decide("changes")} className="rounded-md border border-line px-3 py-1.5 text-xs text-text hover:bg-panel-2 disabled:opacity-50 min-h-9">
          Pedir cambios
        </button>
        <button type="button" disabled={pending} onClick={() => decide("rejected")} className="rounded-md border border-line px-3 py-1.5 text-xs text-muted hover:text-err disabled:opacity-50 min-h-9">
          Rechazar
        </button>
      </div>
      {error && <div className="mt-2 text-xs text-err">{error}</div>}
    </div>
  );
}

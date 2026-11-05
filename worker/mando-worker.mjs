#!/usr/bin/env node
/**
 * MANDO Worker (Mac). Delgado por diseño:
 *  - hace polling saliente a MANDO (sin puertos abiertos),
 *  - reclama una tarea 'local',
 *  - la ejecuta con `claude -p` usando el skill del agente,
 *  - reporta la ejecución y manda latido.
 * No contiene lógica de agentes. Si la necesita, está mal diseñado.
 *
 * Variables: MANDO_URL, MANDO_AGENT_TOKEN, MANDO_WORKER_NAME (default mac-felipe),
 *            MANDO_WORKDIR (carpeta donde corre claude, p. ej. el vault), MANDO_POLL_SECONDS (default 30)
 */
import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const URL_BASE = (process.env.MANDO_URL ?? "").replace(/\/$/, "");
const TOKEN = process.env.MANDO_AGENT_TOKEN ?? "";
const WORKER = process.env.MANDO_WORKER_NAME ?? "mac-felipe";
const WORKDIR = process.env.MANDO_WORKDIR ?? process.cwd();
const POLL = Number(process.env.MANDO_POLL_SECONDS ?? 30) * 1000;
const LOGDIR = join(homedir(), "Library", "Logs", "mando");
mkdirSync(LOGDIR, { recursive: true });

if (!URL_BASE || !TOKEN) {
  console.error("Faltan MANDO_URL o MANDO_AGENT_TOKEN");
  process.exit(1);
}

const log = (msg) => {
  const line = `${new Date().toISOString()} ${msg}\n`;
  process.stdout.write(line);
  try { appendFileSync(join(LOGDIR, "worker.log"), line); } catch {}
};

async function api(path, body, method = "POST") {
  const res = await fetch(URL_BASE + path, {
    method,
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

function runClaude(prompt) {
  return new Promise((resolve) => {
    const started = Date.now();
    let out = "";
    let err = "";
    const child = spawn("claude", ["-p", prompt, "--output-format", "json"], { cwd: WORKDIR, env: process.env });
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => {
      let summary = out.slice(0, 2000);
      let cost;
      try {
        const j = JSON.parse(out);
        summary = (j.result ?? "").toString().slice(0, 2000);
        cost = typeof j.total_cost_usd === "number" ? j.total_cost_usd : undefined;
      } catch {}
      resolve({ ok: code === 0, summary, cost, error: code === 0 ? undefined : err.slice(0, 2000), duration_s: (Date.now() - started) / 1000 });
    });
  });
}

async function tick() {
  const task = await api("/api/tasks/next", { worker: WORKER, runtime: "local" });
  if (!task) return;
  log(`tarea ${task.id} (${task.agent_id}): ${task.title}`);
  const prompt = task.prompt ?? `/${task.agent_id} ${task.title}`;
  const started = new Date().toISOString();
  const r = await runClaude(prompt);
  await api("/api/runs", {
    agent_id: task.agent_id,
    task_id: task.id,
    status: r.ok ? "ok" : "fail",
    started_at: started,
    duration_s: r.duration_s,
    cost_usd: r.cost,
    summary: r.summary,
    error: r.error,
    worker: WORKER,
    meta: { origin: task.origin },
  });
  log(`fin ${task.id}: ${r.ok ? "ok" : "fail"} en ${r.duration_s.toFixed(0)} s`);
}

async function loop() {
  log(`worker ${WORKER} iniciado, workdir ${WORKDIR}`);
  for (;;) {
    try {
      await tick();
    } catch (e) {
      log(`error: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, POLL));
  }
}

loop();

# MANDO · Central de Operaciones

Consola única para los agentes de Felipe. **Observa y aprueba. No ejecuta.**
Los agentes siguen corriendo donde ya corren (tareas programadas de Claude, crons de Kaivok, el Mac) y le reportan a MANDO.

## Arquitectura

```
Tablero (Next.js en Vercel)  <->  Supabase, esquema `mando`  <->  Worker en el Mac (polling saliente, sin puertos)
                                   agents · tasks · runs · approvals · heartbeats
```

| Pieza | Qué hace | Dónde |
|---|---|---|
| Tablero | Inicio, Agentes, aprobaciones, actividad, estado de ejecución | Vercel |
| API | Recibe runs, latidos y tareas; entrega decisiones | Vercel (`/api/*`) |
| Base de datos | Esquema `mando` dentro del proyecto Supabase de ai-business-os (US$0 extra) | Supabase |
| Scheduler | Cron de Vercel (latido) + tareas programadas de Claude | Nube |
| Worker | Reclama tareas `local`, ejecuta `claude -p <skill>`, reporta | Mac (launchd) |

## Contrato para agentes (lo único que un agente necesita saber)

Todas las llamadas llevan `Authorization: Bearer $MANDO_AGENT_TOKEN`.

**Reportar una ejecución**
```
POST /api/runs
{ "agent_id": "valeria", "status": "ok", "duration_s": 48, "cost_usd": 0.21,
  "summary": "Briefing 4 nov", "output_ref": "System/CC-Digest/2026-11-04.md",
  "worker": "claude-cloud",
  "approval": { "kind": "post", "title": "Post jueves", "content": "..." } }   // opcional
```

**Consultar lo que decidió Felipe**
```
GET /api/approvals?status=approved&agent_id=brand
```

**Encolar una tarea local** (desde una tarea programada en la nube, para que la corra el Mac)
```
POST /api/tasks
{ "agent_id": "strategos", "title": "Procesar inbox", "prompt": "/strategos:inbox", "runtime": "local",
  "origin": "scheduled", "idempotency_key": "inbox-2026-11-04" }
```

**Latido**
```
POST /api/heartbeat  { "worker": "kaivok" }
```

## Despliegue

1. Vercel: proyecto nuevo desde este repo. Variables de `.env.example`. `CRON_SECRET` lo genera Vercel.
2. Supabase: el esquema `mando` ya está aplicado (migración `mando_schema_v1`). `DATABASE_URL` es la misma de Kaivok.
3. Worker en el Mac:
   ```
   cp worker/com.fass.mando-worker.plist ~/Library/LaunchAgents/
   # editar MANDO_URL, MANDO_AGENT_TOKEN y rutas
   launchctl load ~/Library/LaunchAgents/com.fass.mando-worker.plist
   tail -f ~/Library/Logs/mando/worker.log
   ```
4. Primer agente conectado: la tarea programada del briefing (07:30) termina con un `POST /api/runs`.

## Reglas de diseño

- MANDO no ejecuta agentes. Si el worker empieza a tener lógica propia, se detiene y se revisa.
- Local = lo que necesita archivos del Mac. Nube = lo que debe correr aunque el Mac esté cerrado. Kaivok = sus crons.
- Un agente nuevo = una fila en `agents`, y otra que sale.
- Acciones con efecto externo (publicar, enviar, desplegar) pasan por `approvals`. Siempre.

## Desarrollo

```
npm install
cp .env.example .env.local   # completar
npm run dev
```

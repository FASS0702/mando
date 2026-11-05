import {
  pgSchema,
  text,
  uuid,
  timestamp,
  jsonb,
  boolean,
  numeric,
} from "drizzle-orm/pg-core";

export const mando = pgSchema("mando");

export const agents = mando.table("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  runtime: text("runtime").notNull(), // local | cloud | kaivok
  triggerDesc: text("trigger_desc"),
  skill: text("skill"),
  status: text("status").notNull().default("active"), // active | paused | retired
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tasks = mando.table("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: text("agent_id").references(() => agents.id),
  title: text("title").notNull(),
  prompt: text("prompt"),
  origin: text("origin").notNull().default("manual"), // manual | scheduled | automation
  runtime: text("runtime").notNull().default("local"),
  status: text("status").notNull().default("queued"), // queued | running | done | failed | cancelled
  idempotencyKey: text("idempotency_key").unique(),
  payload: jsonb("payload").notNull().default({}),
  claimedBy: text("claimed_by"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const runs = mando.table("runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: text("agent_id").references(() => agents.id),
  taskId: uuid("task_id").references(() => tasks.id),
  status: text("status").notNull(), // ok | fail
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }).notNull().defaultNow(),
  durationS: numeric("duration_s"),
  costUsd: numeric("cost_usd"),
  summary: text("summary"),
  outputRef: text("output_ref"),
  needsApproval: boolean("needs_approval").notNull().default(false),
  error: text("error"),
  meta: jsonb("meta").notNull().default({}),
});

export const approvals = mando.table("approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").references(() => runs.id),
  agentId: text("agent_id").references(() => agents.id),
  kind: text("kind").notNull(), // post | email | deploy | other
  title: text("title").notNull(),
  content: text("content"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected | changes
  decisionNote: text("decision_note"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const heartbeats = mando.table("heartbeats", {
  worker: text("worker").primaryKey(),
  lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
  info: jsonb("info").notNull().default({}),
});

export type Agent = typeof agents.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Run = typeof runs.$inferSelect;
export type Approval = typeof approvals.$inferSelect;
export type Heartbeat = typeof heartbeats.$inferSelect;

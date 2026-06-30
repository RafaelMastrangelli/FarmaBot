import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const metricsSnapshots = pgTable("metrics_snapshots", {
  id: serial("id").primaryKey(),
  totalMensagens: integer("total_mensagens").default(0),
  totalSessoes: integer("total_sessoes").default(0),
  totalPedidos: integer("total_pedidos").default(0),
  receitaTotal: real("receita_total").default(0),
  transferenciasHumano: integer("transferencias_humano").default(0),
  taxaConversao: text("taxa_conversao").default("0"),
  ticketMedio: text("ticket_medio").default("0"),
  geradoEm: text("gerado_em"),
  recebidoEm: timestamp("recebido_em").defaultNow(),
});

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  timestamp: text("timestamp"),
  phone: text("phone"),
  customerName: text("customer_name"),
  step: text("step"),
  orderId: text("order_id"),
  orderTotal: real("order_total"),
  eventType: text("event_type"),
  paymentMethod: text("payment_method"),
  itemsJson: text("items_json"),
  deliveryAddress: text("delivery_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dailyStats = pgTable("daily_stats", {
  date: text("date").primaryKey(),
  mensagens: integer("mensagens").default(0),
  sessoes: integer("sessoes").default(0),
  pedidos: integer("pedidos").default(0),
  receita: real("receita").default(0),
  transferencias: integer("transferencias").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orders = pgTable("orders", {
  orderId: text("order_id").primaryKey(),
  phone: text("phone"),
  customerName: text("customer_name"),
  orderTotal: real("order_total"),
  paymentMethod: text("payment_method"),
  deliveryAddress: text("delivery_address"),
  itemsJson: text("items_json"),
  status: text("status").default("CONFIRMADO"),
  createdAt: text("created_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertMetricsSnapshotSchema = createInsertSchema(metricsSnapshots).omit({
  id: true,
  recebidoEm: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  createdAt: true,
});

export const insertDailyStatsSchema = createInsertSchema(dailyStats).omit({
  updatedAt: true,
});

export const insertOrderSchema = createInsertSchema(orders);

export const metricsPayloadSchema = z.object({
  totalMensagens: z.number().optional().default(0),
  totalSessoes: z.number().optional().default(0),
  totalPedidos: z.number().optional().default(0),
  receitaTotal: z.number().optional().default(0),
  transferenciasHumano: z.number().optional().default(0),
  taxaConversao: z.string().optional().default("0"),
  ticketMedio: z.string().optional().default("0"),
  geradoEm: z.string().optional(),
  ultimosEventos: z.array(z.object({
    id: z.string(),
    timestamp: z.string().nullish(),
    phone: z.string().nullish(),
    customerName: z.string().nullish(),
    step: z.string().nullish(),
    orderId: z.string().nullish(),
    orderTotal: z.number().nullish(),
    event: z.string().nullish(),
    paymentMethod: z.string().nullish(),
    items: z.any().nullish(),
    deliveryAddress: z.string().nullish(),
  })).optional().default([]),
  estatisticasDiarias: z.record(z.string(), z.object({
    mensagens: z.number().optional().default(0),
    sessoes: z.number().optional().default(0),
    pedidos: z.number().optional().default(0),
    receita: z.number().optional().default(0),
    transferencias: z.number().optional().default(0),
  })).optional().default({}),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type MetricsSnapshot = typeof metricsSnapshots.$inferSelect;
export type Event = typeof events.$inferSelect;
export type DailyStats = typeof dailyStats.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type MetricsPayload = z.infer<typeof metricsPayloadSchema>;

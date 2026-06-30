import {
  type User, type InsertUser,
  type MetricsSnapshot, type Event, type DailyStats, type Order,
  users, metricsSnapshots, events, dailyStats, orders,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte, lte, ilike } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  saveMetricsSnapshot(data: Partial<MetricsSnapshot>): Promise<void>;
  getLatestSnapshot(): Promise<MetricsSnapshot | null>;

  upsertEvent(event: Partial<Event>): Promise<void>;
  getEvents(limit: number, type?: string): Promise<Event[]>;
  getEventsByPhone(phone: string): Promise<Event[]>;

  upsertDailyStats(date: string, stats: Partial<DailyStats>): Promise<void>;
  getDailyStats(from?: string, to?: string): Promise<DailyStats[]>;

  upsertOrder(order: Partial<Order>): Promise<void>;
  getOrders(filters?: {
    limit?: number;
    offset?: number;
    from?: string;
    to?: string;
    paymentMethod?: string;
    search?: string;
  }): Promise<{ orders: Order[]; total: number }>;
  getOrderById(orderId: string): Promise<Order | null>;

  getCustomers(limit?: number): Promise<any[]>;
  getFunnelData(): Promise<any>;
  getProductRanking(): Promise<any[]>;
  getConsolidatedStats(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async saveMetricsSnapshot(data: Partial<MetricsSnapshot>): Promise<void> {
    await db.insert(metricsSnapshots).values({
      totalMensagens: data.totalMensagens ?? 0,
      totalSessoes: data.totalSessoes ?? 0,
      totalPedidos: data.totalPedidos ?? 0,
      receitaTotal: data.receitaTotal ?? 0,
      transferenciasHumano: data.transferenciasHumano ?? 0,
      taxaConversao: data.taxaConversao ?? "0",
      ticketMedio: data.ticketMedio ?? "0",
      geradoEm: data.geradoEm,
    });
  }

  async getLatestSnapshot(): Promise<MetricsSnapshot | null> {
    const [snapshot] = await db
      .select()
      .from(metricsSnapshots)
      .orderBy(desc(metricsSnapshots.id))
      .limit(1);
    return snapshot ?? null;
  }

  async upsertEvent(event: Partial<Event>): Promise<void> {
    await db
      .insert(events)
      .values({
        id: event.id!,
        timestamp: event.timestamp,
        phone: event.phone,
        customerName: event.customerName,
        step: event.step,
        orderId: event.orderId,
        orderTotal: event.orderTotal,
        eventType: event.eventType,
        paymentMethod: event.paymentMethod,
        itemsJson: event.itemsJson,
        deliveryAddress: event.deliveryAddress,
      })
      .onConflictDoUpdate({
        target: events.id,
        set: {
          timestamp: event.timestamp,
          phone: event.phone,
          customerName: event.customerName,
          step: event.step,
          orderId: event.orderId,
          orderTotal: event.orderTotal,
          eventType: event.eventType,
          paymentMethod: event.paymentMethod,
          itemsJson: event.itemsJson,
          deliveryAddress: event.deliveryAddress,
        },
      });
  }

  async getEvents(limit: number = 50, type?: string): Promise<Event[]> {
    const conditions = type ? [eq(events.eventType, type)] : [];
    const query = db
      .select()
      .from(events)
      .orderBy(desc(events.createdAt))
      .limit(limit);

    if (conditions.length > 0) {
      return query.where(conditions[0]);
    }
    return query;
  }

  async getEventsByPhone(phone: string): Promise<Event[]> {
    return db
      .select()
      .from(events)
      .where(eq(events.phone, phone))
      .orderBy(desc(events.createdAt));
  }

  async upsertDailyStats(date: string, stats: Partial<DailyStats>): Promise<void> {
    await db
      .insert(dailyStats)
      .values({
        date,
        mensagens: stats.mensagens ?? 0,
        sessoes: stats.sessoes ?? 0,
        pedidos: stats.pedidos ?? 0,
        receita: stats.receita ?? 0,
        transferencias: stats.transferencias ?? 0,
      })
      .onConflictDoUpdate({
        target: dailyStats.date,
        set: {
          mensagens: stats.mensagens ?? 0,
          sessoes: stats.sessoes ?? 0,
          pedidos: stats.pedidos ?? 0,
          receita: stats.receita ?? 0,
          transferencias: stats.transferencias ?? 0,
        },
      });
  }

  async getDailyStats(from?: string, to?: string): Promise<DailyStats[]> {
    const conditions = [];
    if (from) conditions.push(gte(dailyStats.date, from));
    if (to) conditions.push(lte(dailyStats.date, to));

    if (conditions.length > 0) {
      return db
        .select()
        .from(dailyStats)
        .where(and(...conditions))
        .orderBy(dailyStats.date);
    }
    return db.select().from(dailyStats).orderBy(dailyStats.date);
  }

  async upsertOrder(order: Partial<Order>): Promise<void> {
    await db
      .insert(orders)
      .values({
        orderId: order.orderId!,
        phone: order.phone,
        customerName: order.customerName,
        orderTotal: order.orderTotal,
        paymentMethod: order.paymentMethod,
        deliveryAddress: order.deliveryAddress,
        itemsJson: order.itemsJson,
        status: order.status ?? "CONFIRMADO",
        createdAt: order.createdAt,
      })
      .onConflictDoUpdate({
        target: orders.orderId,
        set: {
          phone: order.phone,
          customerName: order.customerName,
          orderTotal: order.orderTotal,
          paymentMethod: order.paymentMethod,
          deliveryAddress: order.deliveryAddress,
          itemsJson: order.itemsJson,
          status: order.status,
        },
      });
  }

  async getOrders(filters?: {
    limit?: number;
    offset?: number;
    from?: string;
    to?: string;
    paymentMethod?: string;
    search?: string;
  }): Promise<{ orders: Order[]; total: number }> {
    const limit = filters?.limit ?? 20;
    const offset = filters?.offset ?? 0;
    const conditions = [];

    if (filters?.from) conditions.push(gte(orders.createdAt, filters.from));
    if (filters?.to) conditions.push(lte(orders.createdAt, filters.to));
    if (filters?.paymentMethod) conditions.push(eq(orders.paymentMethod, filters.paymentMethod));
    if (filters?.search) {
      conditions.push(
        sql`(${orders.customerName} ILIKE ${'%' + filters.search + '%'} OR ${orders.phone} ILIKE ${'%' + filters.search + '%'})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(whereClause);

    const ordersList = await db
      .select()
      .from(orders)
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    return { orders: ordersList, total: Number(countResult?.count ?? 0) };
  }

  async getOrderById(orderId: string): Promise<Order | null> {
    const [order] = await db.select().from(orders).where(eq(orders.orderId, orderId));
    return order ?? null;
  }

  async getCustomers(limit: number = 20): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT 
        e.phone,
        MAX(e.customer_name) as customer_name,
        COUNT(DISTINCT CASE WHEN e.event_type = 'MENSAGEM' OR e.event_type IS NOT NULL THEN e.id END) as total_sessoes,
        COUNT(DISTINCT e.order_id) FILTER (WHERE e.order_id IS NOT NULL) as total_pedidos,
        COALESCE(SUM(DISTINCT CASE WHEN e.order_id IS NOT NULL THEN e.order_total ELSE 0 END), 0) as valor_total,
        MAX(e.timestamp) as ultima_interacao,
        MAX(e.step) as ultimo_step
      FROM events e
      WHERE e.phone IS NOT NULL
      GROUP BY e.phone
      ORDER BY MAX(e.timestamp) DESC
      LIMIT ${limit}
    `);
    return result.rows;
  }

  async getFunnelData(): Promise<any> {
    const result = await db.execute(sql`
      SELECT
        COUNT(DISTINCT phone) FILTER (WHERE step IS NOT NULL) as sessoes,
        COUNT(DISTINCT phone) FILTER (WHERE step IN ('ESCOLHENDO_CATEGORIA', 'ESCOLHENDO_PRODUTO', 'DETALHES_PRODUTO', 'POS_ADICIONAR', 'REVISANDO_CARRINHO', 'AGUARDANDO_ENDERECO', 'ESCOLHENDO_PAGAMENTO', 'CONFIRMANDO_PEDIDO', 'PEDIDO_FINALIZADO')) as navegou_catalogo,
        COUNT(DISTINCT phone) FILTER (WHERE step IN ('POS_ADICIONAR', 'REVISANDO_CARRINHO', 'AGUARDANDO_ENDERECO', 'ESCOLHENDO_PAGAMENTO', 'CONFIRMANDO_PEDIDO', 'PEDIDO_FINALIZADO')) as adicionou_carrinho,
        COUNT(DISTINCT phone) FILTER (WHERE step IN ('AGUARDANDO_ENDERECO', 'ESCOLHENDO_PAGAMENTO', 'CONFIRMANDO_PEDIDO', 'PEDIDO_FINALIZADO')) as iniciou_checkout,
        COUNT(DISTINCT phone) FILTER (WHERE step = 'PEDIDO_FINALIZADO') as pedido_confirmado,
        COUNT(DISTINCT phone) FILTER (WHERE step = 'AGUARDANDO_HUMANO') as transferiu_humano
      FROM events
    `);
    return result.rows[0] ?? {};
  }

  async getProductRanking(): Promise<any[]> {
    const allOrders = await db.select().from(orders);
    const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};

    for (const order of allOrders) {
      if (order.itemsJson) {
        try {
          const items = JSON.parse(order.itemsJson);
          if (Array.isArray(items)) {
            for (const item of items) {
              const name = item.name || item.produto || "Desconhecido";
              if (!productMap[name]) {
                productMap[name] = { name, qty: 0, revenue: 0 };
              }
              productMap[name].qty += item.quantity || item.quantidade || 1;
              productMap[name].revenue += (item.price || item.preco || 0) * (item.quantity || item.quantidade || 1);
            }
          }
        } catch {}
      }
    }

    return Object.values(productMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }

  async getConsolidatedStats(): Promise<any> {
    const snapshot = await this.getLatestSnapshot();
    const orderResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(order_total), 0) as total_revenue,
        COALESCE(AVG(order_total), 0) as avg_ticket
      FROM orders
    `);
    const eventResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT phone) as unique_phones
      FROM events
    `);

    const orderStats = orderResult.rows?.[0] ?? {};
    const eventStats = eventResult.rows?.[0] ?? {};

    return {
      totalMensagens: snapshot?.totalMensagens ?? 0,
      totalSessoes: snapshot?.totalSessoes ?? 0,
      totalPedidos: snapshot?.totalPedidos ?? Number(orderStats?.total_orders ?? 0),
      receitaTotal: snapshot?.receitaTotal ?? Number(orderStats?.total_revenue ?? 0),
      transferenciasHumano: snapshot?.transferenciasHumano ?? 0,
      taxaConversao: snapshot?.taxaConversao ?? "0",
      ticketMedio: snapshot?.ticketMedio ?? (Number(orderStats?.avg_ticket ?? 0)).toFixed(2),
      geradoEm: snapshot?.geradoEm,
      totalEventos: Number(eventStats?.total_events ?? 0),
      clientesUnicos: Number(eventStats?.unique_phones ?? 0),
    };
  }
}

export const storage = new DatabaseStorage();

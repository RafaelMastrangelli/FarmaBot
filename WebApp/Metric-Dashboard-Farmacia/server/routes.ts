import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { metricsPayloadSchema } from "@shared/schema";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(hashed, "hex"), buf);
}

const sseClients: Set<Response> = new Set();

function broadcastEvent(event: any) {
  const data = JSON.stringify(event);
  for (const client of sseClients) {
    client.write(`data: ${data}\n\n`);
  }
}

function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req.session as any)?.authenticated) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const MemoryStore = (await import("memorystore")).default(session);

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "farmacia-dashboard-secret",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({ checkPeriod: 86400000 }),
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    })
  );

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const dashUser = process.env.DASHBOARD_USER || "admin";
      const dashPassword = process.env.DASHBOARD_PASSWORD || "admin";

      if (username === dashUser && password === dashPassword) {
        (req.session as any).authenticated = true;
        (req.session as any).username = username;
        return res.json({ ok: true, username });
      }

      return res.status(401).json({ error: "Invalid credentials" });
    } catch (error) {
      return res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/check", (req: Request, res: Response) => {
    if ((req.session as any)?.authenticated) {
      return res.json({ authenticated: true, username: (req.session as any).username });
    }
    return res.status(401).json({ authenticated: false });
  });

  app.post("/api/metrics", requireApiKey, async (req: Request, res: Response) => {
    try {
      const parsed = metricsPayloadSchema.parse(req.body);

      await storage.saveMetricsSnapshot({
        totalMensagens: parsed.totalMensagens,
        totalSessoes: parsed.totalSessoes,
        totalPedidos: parsed.totalPedidos,
        receitaTotal: parsed.receitaTotal,
        transferenciasHumano: parsed.transferenciasHumano,
        taxaConversao: parsed.taxaConversao,
        ticketMedio: parsed.ticketMedio,
        geradoEm: parsed.geradoEm,
      });

      if (parsed.ultimosEventos && parsed.ultimosEventos.length > 0) {
        for (const evt of parsed.ultimosEventos) {
          await storage.upsertEvent({
            id: evt.id,
            timestamp: evt.timestamp,
            phone: evt.phone,
            customerName: evt.customerName,
            step: evt.step,
            orderId: evt.orderId,
            orderTotal: evt.orderTotal,
            eventType: evt.event,
            paymentMethod: evt.paymentMethod,
            itemsJson: evt.items ? JSON.stringify(evt.items) : undefined,
            deliveryAddress: evt.deliveryAddress,
          });

          broadcastEvent({
            id: evt.id,
            timestamp: evt.timestamp,
            phone: evt.phone,
            customerName: evt.customerName,
            step: evt.step,
            orderId: evt.orderId,
            orderTotal: evt.orderTotal,
            eventType: evt.event,
            paymentMethod: evt.paymentMethod,
          });

          if (evt.event === "PEDIDO_CRIADO" && evt.orderId) {
            await storage.upsertOrder({
              orderId: evt.orderId,
              phone: evt.phone,
              customerName: evt.customerName,
              orderTotal: evt.orderTotal,
              paymentMethod: evt.paymentMethod,
              deliveryAddress: evt.deliveryAddress,
              itemsJson: evt.items ? JSON.stringify(evt.items) : undefined,
              status: "CONFIRMADO",
              createdAt: evt.timestamp,
            });
          }
        }
      }

      if (parsed.estatisticasDiarias) {
        for (const [date, stats] of Object.entries(parsed.estatisticasDiarias)) {
          await storage.upsertDailyStats(date, {
            mensagens: stats.mensagens,
            sessoes: stats.sessoes,
            pedidos: stats.pedidos,
            receita: stats.receita,
            transferencias: stats.transferencias,
          });
        }
      }

      return res.json({ status: "ok", saved: true });
    } catch (error: any) {
      console.error("Error processing metrics:", error);
      return res.status(400).json({ error: error.message || "Invalid payload" });
    }
  });

  app.get("/api/stats", requireAuth, async (_req: Request, res: Response) => {
    try {
      const stats = await storage.getConsolidatedStats();
      return res.json(stats);
    } catch (error) {
      return res.status(500).json({ error: "Failed to get stats" });
    }
  });

  app.get("/api/stats/daily", requireAuth, async (req: Request, res: Response) => {
    try {
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      const stats = await storage.getDailyStats(from, to);
      return res.json(stats);
    } catch (error) {
      return res.status(500).json({ error: "Failed to get daily stats" });
    }
  });

  app.get("/api/events", requireAuth, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const type = req.query.type as string | undefined;
      const eventsList = await storage.getEvents(limit, type);
      return res.json(eventsList);
    } catch (error) {
      return res.status(500).json({ error: "Failed to get events" });
    }
  });

  app.get("/api/events/live", requireAuth, (req: Request, res: Response) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write("data: {\"connected\":true}\n\n");
    sseClients.add(res);
    req.on("close", () => {
      sseClients.delete(res);
    });
  });

  app.get("/api/funnel", requireAuth, async (_req: Request, res: Response) => {
    try {
      const funnel = await storage.getFunnelData();
      return res.json(funnel);
    } catch (error) {
      return res.status(500).json({ error: "Failed to get funnel data" });
    }
  });

  app.get("/api/products/ranking", requireAuth, async (_req: Request, res: Response) => {
    try {
      const ranking = await storage.getProductRanking();
      return res.json(ranking);
    } catch (error) {
      return res.status(500).json({ error: "Failed to get product ranking" });
    }
  });

  app.get("/api/customers", requireAuth, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const customers = await storage.getCustomers(limit);
      return res.json(customers);
    } catch (error) {
      return res.status(500).json({ error: "Failed to get customers" });
    }
  });

  app.get("/api/orders", requireAuth, async (req: Request, res: Response) => {
    try {
      const filters = {
        limit: parseInt(req.query.limit as string) || 20,
        offset: parseInt(req.query.offset as string) || 0,
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        paymentMethod: req.query.paymentMethod as string | undefined,
        search: req.query.search as string | undefined,
      };
      const result = await storage.getOrders(filters);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: "Failed to get orders" });
    }
  });

  app.get("/api/orders/:orderId", requireAuth, async (req: Request, res: Response) => {
    try {
      const order = await storage.getOrderById(req.params.orderId);
      if (!order) return res.status(404).json({ error: "Order not found" });
      return res.json(order);
    } catch (error) {
      return res.status(500).json({ error: "Failed to get order" });
    }
  });

  return httpServer;
}

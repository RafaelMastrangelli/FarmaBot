import { db } from "./db";
import { metricsSnapshots, events, dailyStats, orders } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const [existing] = await db.select({ count: sql<number>`count(*)` }).from(events);
  if (Number(existing?.count) > 0) return;

  console.log("Seeding database with sample data...");

  const now = new Date();
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }

  await db.insert(metricsSnapshots).values({
    totalMensagens: 847,
    totalSessoes: 156,
    totalPedidos: 42,
    receitaTotal: 3287.5,
    transferenciasHumano: 12,
    taxaConversao: "26.9",
    ticketMedio: "78.27",
    geradoEm: now.toISOString(),
  });

  const dailyData = [
    { date: days[0], mensagens: 95, sessoes: 18, pedidos: 4, receita: 312.4, transferencias: 1 },
    { date: days[1], mensagens: 112, sessoes: 22, pedidos: 6, receita: 467.8, transferencias: 2 },
    { date: days[2], mensagens: 134, sessoes: 25, pedidos: 7, receita: 545.2, transferencias: 1 },
    { date: days[3], mensagens: 89, sessoes: 16, pedidos: 5, receita: 389.9, transferencias: 3 },
    { date: days[4], mensagens: 145, sessoes: 28, pedidos: 8, receita: 623.1, transferencias: 2 },
    { date: days[5], mensagens: 128, sessoes: 24, pedidos: 7, receita: 512.6, transferencias: 1 },
    { date: days[6], mensagens: 144, sessoes: 23, pedidos: 5, receita: 436.5, transferencias: 2 },
  ];

  for (const d of dailyData) {
    await db.insert(dailyStats).values(d);
  }

  const produtos = [
    { name: "Dipirona 500mg", price: 8.9 },
    { name: "Paracetamol 750mg", price: 12.5 },
    { name: "Ibuprofeno 400mg", price: 15.9 },
    { name: "Vitamina C 1g", price: 22.0 },
    { name: "Protetor Solar FPS 50", price: 45.9 },
    { name: "Shampoo Anticaspa", price: 32.5 },
    { name: "Creme Hidratante", price: 28.9 },
    { name: "Algodao 50g", price: 6.5 },
    { name: "Alcool Gel 500ml", price: 14.9 },
    { name: "Mascara Descartavel cx50", price: 35.0 },
  ];

  const clientes = [
    { name: "Joao Silva", phone: "5531999887766" },
    { name: "Maria Santos", phone: "5531988776655" },
    { name: "Pedro Oliveira", phone: "5531977665544" },
    { name: "Ana Costa", phone: "5531966554433" },
    { name: "Carlos Souza", phone: "5531955443322" },
    { name: "Lucia Ferreira", phone: "5531944332211" },
    { name: "Roberto Lima", phone: "5531933221100" },
    { name: "Fernanda Alves", phone: "5531922110099" },
  ];

  const paymentMethods = ["PIX", "CARTAO_CREDITO", "CARTAO_DEBITO", "DINHEIRO"];
  const steps = [
    "MENU_PRINCIPAL", "ESCOLHENDO_CATEGORIA", "ESCOLHENDO_PRODUTO",
    "DETALHES_PRODUTO", "POS_ADICIONAR", "REVISANDO_CARRINHO",
    "AGUARDANDO_ENDERECO", "ESCOLHENDO_PAGAMENTO", "CONFIRMANDO_PEDIDO",
    "PEDIDO_FINALIZADO", "AGUARDANDO_HUMANO", "AGUARDANDO_RECEITA"
  ];

  const sampleOrders = [];
  for (let i = 0; i < 42; i++) {
    const cliente = clientes[i % clientes.length];
    const numItems = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let subtotal = 0;
    for (let j = 0; j < numItems; j++) {
      const prod = produtos[Math.floor(Math.random() * produtos.length)];
      const qty = Math.floor(Math.random() * 3) + 1;
      items.push({ name: prod.name, price: prod.price, quantity: qty });
      subtotal += prod.price * qty;
    }
    const payment = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    const discount = payment === "PIX" ? subtotal * 0.05 : 0;
    const total = subtotal + 5.9 - discount;
    const orderDate = new Date(now);
    orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 7));
    orderDate.setHours(Math.floor(Math.random() * 14) + 8);
    orderDate.setMinutes(Math.floor(Math.random() * 60));

    const orderId = `PED-${orderDate.getTime()}-${i}`;
    sampleOrders.push({
      orderId,
      phone: cliente.phone,
      customerName: cliente.name,
      orderTotal: Math.round(total * 100) / 100,
      paymentMethod: payment,
      deliveryAddress: `Rua ${["das Flores", "dos Ipes", "Principal", "da Paz", "Sao Paulo"][i % 5]}, ${100 + i}, Belo Horizonte - MG`,
      itemsJson: JSON.stringify(items),
      status: ["CONFIRMADO", "CONFIRMADO", "CONFIRMADO", "EM_PREPARO", "ENTREGUE"][Math.floor(Math.random() * 5)],
      createdAt: orderDate.toISOString(),
    });
  }

  for (const order of sampleOrders) {
    await db.insert(orders).values(order);
  }

  const sampleEvents = [];
  let evtIdx = 0;
  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (6 - dayIdx));
    const numEvents = Math.floor(Math.random() * 15) + 10;
    for (let e = 0; e < numEvents; e++) {
      const cliente = clientes[Math.floor(Math.random() * clientes.length)];
      const step = steps[Math.floor(Math.random() * steps.length)];
      const evtDate = new Date(date);
      evtDate.setHours(Math.floor(Math.random() * 14) + 8);
      evtDate.setMinutes(Math.floor(Math.random() * 60));
      const isOrder = step === "PEDIDO_FINALIZADO";
      const isTransfer = step === "AGUARDANDO_HUMANO";
      let eventType = "MENSAGEM";
      if (isOrder) eventType = "PEDIDO_CRIADO";
      if (isTransfer) eventType = "TRANSFERENCIA_HUMANO";

      sampleEvents.push({
        id: `EVT-${evtDate.getTime()}-${evtIdx}`,
        timestamp: evtDate.toISOString(),
        phone: cliente.phone,
        customerName: cliente.name,
        step,
        orderId: isOrder ? sampleOrders[evtIdx % sampleOrders.length]?.orderId : null,
        orderTotal: isOrder ? sampleOrders[evtIdx % sampleOrders.length]?.orderTotal : null,
        eventType,
        paymentMethod: isOrder ? paymentMethods[Math.floor(Math.random() * paymentMethods.length)] : null,
      });
      evtIdx++;
    }
  }

  for (const evt of sampleEvents) {
    await db.insert(events).values(evt);
  }

  console.log(`Seeded: ${sampleOrders.length} orders, ${sampleEvents.length} events, ${dailyData.length} daily stats`);
}

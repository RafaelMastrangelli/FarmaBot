import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/kpi-card";
import { UserX, ShoppingCart, AlertTriangle, TrendingDown } from "lucide-react";
import { useMemo } from "react";

function maskPhone(phone: string | null) {
  if (!phone) return "---";
  if (phone.length < 8) return phone;
  return phone.slice(0, 4) + "****" + phone.slice(-4);
}

function classifyAbandonment(step: string | null): { reason: string; color: string } {
  const s = step ?? "";
  if (["MENU_PRINCIPAL", "ESCOLHENDO_CATEGORIA"].includes(s)) {
    return { reason: "Apenas explorou", color: "bg-muted text-muted-foreground" };
  }
  if (["ESCOLHENDO_PRODUTO", "DETALHES_PRODUTO"].includes(s)) {
    return { reason: "Desistiu na escolha", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" };
  }
  if (s === "AGUARDANDO_RECEITA") {
    return { reason: "Bloqueado por receita", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" };
  }
  if (["REVISANDO_CARRINHO", "AGUARDANDO_ENDERECO", "ESCOLHENDO_PAGAMENTO"].includes(s)) {
    return { reason: "Abandonou carrinho", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" };
  }
  if (s === "CONFIRMANDO_PEDIDO") {
    return { reason: "Cancelou no checkout", color: "bg-red-500/10 text-red-600 dark:text-red-400" };
  }
  if (s === "AGUARDANDO_HUMANO") {
    return { reason: "Pediu atendente", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" };
  }
  return { reason: "Outros", color: "bg-muted text-muted-foreground" };
}

const abandonmentSteps = [
  "MENU_PRINCIPAL", "ESCOLHENDO_CATEGORIA", "ESCOLHENDO_PRODUTO",
  "DETALHES_PRODUTO", "AGUARDANDO_RECEITA", "POS_ADICIONAR",
  "REVISANDO_CARRINHO", "AGUARDANDO_ENDERECO", "ESCOLHENDO_PAGAMENTO",
  "CONFIRMANDO_PEDIDO", "AGUARDANDO_HUMANO",
];

export default function AbandonmentPage() {
  const { data: eventsData, isLoading } = useQuery<any[]>({
    queryKey: ["/api/events", "?limit=500"],
  });

  const { data: funnelData } = useQuery<any>({
    queryKey: ["/api/funnel"],
  });

  const analysis = useMemo(() => {
    if (!eventsData) return { abandonedSessions: [], heatmap: {}, kpis: { abandonRate: 0, topStep: "---", lostValue: 0 } };

    const sessionMap = new Map<string, any[]>();
    for (const evt of eventsData) {
      if (!evt.phone) continue;
      if (!sessionMap.has(evt.phone)) sessionMap.set(evt.phone, []);
      sessionMap.get(evt.phone)!.push(evt);
    }

    const abandoned: any[] = [];
    const heatmap: Record<string, number> = {};
    let cartAbandoned = 0;
    let totalSessions = 0;
    let lostValue = 0;

    for (const [phone, events] of sessionMap.entries()) {
      totalSessions++;
      const hasOrder = events.some(e => e.eventType === "PEDIDO_CRIADO");
      if (hasOrder) continue;

      const lastEvent = events.sort((a: any, b: any) =>
        new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime()
      )[0];

      const lastStep = lastEvent?.step ?? "MENU_PRINCIPAL";
      heatmap[lastStep] = (heatmap[lastStep] ?? 0) + 1;

      const hadCart = events.some((e: any) =>
        ["POS_ADICIONAR", "REVISANDO_CARRINHO", "AGUARDANDO_ENDERECO", "ESCOLHENDO_PAGAMENTO", "CONFIRMANDO_PEDIDO"].includes(e.step)
      );
      if (hadCart) {
        cartAbandoned++;
        lostValue += lastEvent?.orderTotal ?? 0;
      }

      abandoned.push({
        phone,
        customerName: lastEvent?.customerName ?? "Desconhecido",
        lastStep,
        messageCount: events.length,
        lastTimestamp: lastEvent?.timestamp,
        ...classifyAbandonment(lastStep),
      });
    }

    const topStep = Object.entries(heatmap).sort((a, b) => b[1] - a[1])[0];

    return {
      abandonedSessions: abandoned.sort((a, b) =>
        new Date(b.lastTimestamp ?? 0).getTime() - new Date(a.lastTimestamp ?? 0).getTime()
      ),
      heatmap,
      kpis: {
        abandonRate: totalSessions > 0 ? Math.round((cartAbandoned / totalSessions) * 100) : 0,
        topStep: topStep?.[0] ?? "---",
        lostValue: Math.round(lostValue * 100) / 100,
      },
    };
  }, [eventsData]);

  const maxHeatVal = Math.max(...Object.values(analysis.heatmap), 1);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4" data-testid="abandonment-loading">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-auto" data-testid="abandonment-page">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <UserX className="w-5 h-5 text-primary" />
          Desistencias e Abandono
        </h1>
        <p className="text-sm text-muted-foreground">Analise de onde os clientes desistem da compra</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard
          title="Taxa de Abandono de Carrinho"
          value={`${analysis.kpis.abandonRate}%`}
          icon={ShoppingCart}
          color="red"
          testId="kpi-abandon-rate"
        />
        <KpiCard
          title="Estado com Maior Abandono"
          value={analysis.kpis.topStep}
          icon={AlertTriangle}
          color="orange"
          testId="kpi-top-step"
        />
        <KpiCard
          title="Valor Perdido (Carrinhos)"
          value={`R$ ${analysis.kpis.lostValue.toFixed(2).replace(".", ",")}`}
          icon={TrendingDown}
          color="red"
          testId="kpi-lost-value"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Mapa de Calor de Abandono por Estado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {abandonmentSteps.map((step) => {
              const count = analysis.heatmap[step] ?? 0;
              const intensity = count / maxHeatVal;
              return (
                <div key={step} className="flex items-center gap-3">
                  <span className="text-xs w-40 truncate text-muted-foreground font-mono">{step}</span>
                  <div className="flex-1 h-6 rounded-sm relative bg-muted">
                    <div
                      className="h-full rounded-sm transition-all duration-300"
                      style={{
                        width: `${Math.max(intensity * 100, count > 0 ? 3 : 0)}%`,
                        backgroundColor: `hsl(${Math.max(0, 120 - intensity * 120)}, 70%, ${45 + intensity * 10}%)`,
                      }}
                    />
                  </div>
                  <span className="text-xs w-8 text-right font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Sessoes Abandonadas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {analysis.abandonedSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserX className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma sessao abandonada encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Ultimo Estado</TableHead>
                    <TableHead className="text-right">Mensagens</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.abandonedSessions.slice(0, 50).map((session: any, idx: number) => (
                    <TableRow key={idx} data-testid={`row-abandoned-${idx}`}>
                      <TableCell className="text-sm font-medium">{session.customerName}</TableCell>
                      <TableCell className="text-sm font-mono">{maskPhone(session.phone)}</TableCell>
                      <TableCell className="font-mono text-xs">{session.lastStep}</TableCell>
                      <TableCell className="text-right text-sm">{session.messageCount}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={session.color}>{session.reason}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

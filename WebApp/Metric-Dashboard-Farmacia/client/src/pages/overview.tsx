import { useQuery } from "@tanstack/react-query";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MessageSquare, Users, ShoppingCart, DollarSign, TrendingUp, Tag,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { useState, useMemo } from "react";

function formatCurrency(val: number | string) {
  return `R$ ${Number(val).toFixed(2).replace(".", ",")}`;
}

function formatDate(dateStr: string) {
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return dateStr;
}

const CHART_COLORS = {
  mensagens: "hsl(205, 85%, 42%)",
  sessoes: "hsl(185, 65%, 40%)",
  pedidos: "hsl(215, 55%, 32%)",
  receita: "hsl(195, 70%, 48%)",
};

const PIE_COLORS = [
  "hsl(205, 85%, 42%)",
  "hsl(185, 65%, 40%)",
  "hsl(215, 55%, 28%)",
  "hsl(195, 70%, 48%)",
  "hsl(170, 45%, 42%)",
];

export default function OverviewPage() {
  const [period, setPeriod] = useState("7");

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/stats"],
  });

  const { data: dailyStats, isLoading: dailyLoading } = useQuery<any[]>({
    queryKey: ["/api/stats/daily"],
  });

  const { data: funnelData, isLoading: funnelLoading } = useQuery<any>({
    queryKey: ["/api/funnel"],
  });

  const { data: productRanking, isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ["/api/products/ranking"],
  });

  const filteredDaily = useMemo(() => {
    if (!dailyStats) return [];
    const days = parseInt(period);
    return dailyStats.slice(-days);
  }, [dailyStats, period]);

  const funnelChartData = useMemo(() => {
    if (!funnelData) return [];
    const sessoes = Number(funnelData.sessoes) || 1;
    return [
      { name: "Sessoes", value: Number(funnelData.sessoes) || 0, pct: 100 },
      { name: "Catalogo", value: Number(funnelData.navegou_catalogo) || 0, pct: Math.round(((Number(funnelData.navegou_catalogo) || 0) / sessoes) * 100) },
      { name: "Carrinho", value: Number(funnelData.adicionou_carrinho) || 0, pct: Math.round(((Number(funnelData.adicionou_carrinho) || 0) / sessoes) * 100) },
      { name: "Checkout", value: Number(funnelData.iniciou_checkout) || 0, pct: Math.round(((Number(funnelData.iniciou_checkout) || 0) / sessoes) * 100) },
      { name: "Confirmado", value: Number(funnelData.pedido_confirmado) || 0, pct: Math.round(((Number(funnelData.pedido_confirmado) || 0) / sessoes) * 100) },
      { name: "Transf. Humano", value: Number(funnelData.transferiu_humano) || 0, pct: Math.round(((Number(funnelData.transferiu_humano) || 0) / sessoes) * 100) },
    ];
  }, [funnelData]);

  const paymentData = useMemo(() => {
    return [
      { name: "PIX", value: 45 },
      { name: "Credito", value: 25 },
      { name: "Debito", value: 18 },
      { name: "Dinheiro", value: 12 },
    ];
  }, []);

  const funnelColors = [
    "hsl(205, 85%, 38%)",
    "hsl(195, 70%, 45%)",
    "hsl(185, 65%, 42%)",
    "hsl(215, 55%, 32%)",
    "hsl(0, 84%, 50%)",
    "hsl(0, 0%, 55%)",
  ];

  if (statsLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="overview-loading">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-md" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-auto" data-testid="overview-page">
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Visao Geral</h1>
          <p className="text-sm text-muted-foreground">Metricas consolidadas do FarmaBot</p>
        </div>
        {stats?.geradoEm && (
          <p className="text-xs text-muted-foreground" data-testid="text-last-update">
            Atualizado: {new Date(stats.geradoEm).toLocaleString("pt-BR")}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard title="Total Mensagens" value={stats?.totalMensagens ?? 0} icon={MessageSquare} color="blue" testId="kpi-mensagens" />
        <KpiCard title="Sessoes" value={stats?.totalSessoes ?? 0} icon={Users} color="green" testId="kpi-sessoes" />
        <KpiCard title="Pedidos" value={stats?.totalPedidos ?? 0} icon={ShoppingCart} color="darkgreen" testId="kpi-pedidos" />
        <KpiCard title="Receita Total" value={formatCurrency(stats?.receitaTotal ?? 0)} icon={DollarSign} color="gold" testId="kpi-receita" />
        <KpiCard title="Conversao" value={`${stats?.taxaConversao ?? 0}%`} icon={TrendingUp} color="orange" testId="kpi-conversao" />
        <KpiCard title="Ticket Medio" value={formatCurrency(stats?.ticketMedio ?? 0)} icon={Tag} color="purple" testId="kpi-ticket" />
      </div>

      <div className="flex items-center gap-2 justify-end">
        <span className="text-sm text-muted-foreground">Periodo:</span>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-36" data-testid="select-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="15">15 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Evolucao Diaria</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {dailyLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={filteredDaily.map(d => ({ ...d, dateLabel: formatDate(d.date) }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="mensagens" stroke={CHART_COLORS.mensagens} strokeWidth={2} dot={{ r: 3 }} name="Mensagens" />
                  <Line type="monotone" dataKey="sessoes" stroke={CHART_COLORS.sessoes} strokeWidth={2} dot={{ r: 3 }} name="Sessoes" />
                  <Line type="monotone" dataKey="pedidos" stroke={CHART_COLORS.pedidos} strokeWidth={2} dot={{ r: 3 }} name="Pedidos" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Diaria</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {dailyLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={filteredDaily.map(d => ({ ...d, dateLabel: formatDate(d.date) }))}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.receita} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.receita} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `R$${v}`} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), "Receita"]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
                  <Area type="monotone" dataKey="receita" stroke={CHART_COLORS.receita} strokeWidth={2} fill="url(#revenueGradient)" name="Receita" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funil de Conversao</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {funnelLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={funnelChartData} layout="vertical" margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip formatter={(value: number, name: string, props: any) => [`${value} (${props.payload.pct}%)`, "Quantidade"]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {funnelChartData.map((_, index) => (
                      <Cell key={index} fill={funnelColors[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Formas de Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-center h-[260px]">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {paymentData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {productRanking && productRanking.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={Math.max(200, productRanking.length * 40)}>
              <BarChart data={productRanking} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip formatter={(value: number, name: string) => [name === "qty" ? `${value} un.` : formatCurrency(value), name === "qty" ? "Quantidade" : "Receita"]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="qty" fill="hsl(205, 85%, 42%)" radius={[0, 4, 4, 0]} name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

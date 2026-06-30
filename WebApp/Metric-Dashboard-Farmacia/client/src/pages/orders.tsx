import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Eye, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";

function maskPhone(phone: string | null) {
  if (!phone) return "---";
  if (phone.length < 8) return phone;
  return phone.slice(0, 4) + "****" + phone.slice(-4);
}

function formatCurrency(val: number | null) {
  if (val === null || val === undefined) return "R$ 0,00";
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}

function formatDateTime(ts: string | null) {
  if (!ts) return "---";
  try {
    return new Date(ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch { return ts; }
}

function statusBadge(status: string | null) {
  const s = status ?? "CONFIRMADO";
  const variants: Record<string, string> = {
    CONFIRMADO: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    EM_PREPARO: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    ENTREGUE: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  };
  const labels: Record<string, string> = {
    CONFIRMADO: "Confirmado",
    EM_PREPARO: "Em Preparo",
    ENTREGUE: "Entregue",
  };
  return <Badge variant="secondary" className={variants[s] ?? ""}>{labels[s] ?? s}</Badge>;
}

function paymentLabel(method: string | null) {
  const labels: Record<string, string> = {
    PIX: "PIX",
    CARTAO_CREDITO: "Cartao Credito",
    CARTAO_DEBITO: "Cartao Debito",
    DINHEIRO: "Dinheiro",
  };
  return labels[method ?? ""] ?? method ?? "---";
}

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const limit = 15;

  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(limit));
  queryParams.set("offset", String(page * limit));
  if (search) queryParams.set("search", search);
  if (paymentFilter !== "all") queryParams.set("paymentMethod", paymentFilter);

  const { data, isLoading } = useQuery<{ orders: any[]; total: number }>({
    queryKey: ["/api/orders", `?${queryParams.toString()}`],
  });

  const totalPages = Math.ceil((data?.total ?? 0) / limit);

  const downloadCSV = () => {
    if (!data?.orders) return;
    const headers = ["ID", "Data", "Cliente", "Telefone", "Total", "Pagamento", "Status"];
    const rows = data.orders.map((o: any) => [
      o.orderId, formatDateTime(o.createdAt), o.customerName,
      maskPhone(o.phone), o.orderTotal, paymentLabel(o.paymentMethod), o.status,
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pedidos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 overflow-auto" data-testid="orders-page">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-orders-title">Pedidos</h1>
          <p className="text-sm text-muted-foreground">Gerenciamento de pedidos realizados</p>
        </div>
        <Button variant="secondary" onClick={downloadCSV} data-testid="button-export-csv">
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
                data-testid="input-search-orders"
              />
            </div>
            <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); setPage(0); }}>
              <SelectTrigger className="w-44" data-testid="select-payment-filter">
                <SelectValue placeholder="Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="CARTAO_CREDITO">Cartao Credito</SelectItem>
                <SelectItem value="CARTAO_DEBITO">Cartao Debito</SelectItem>
                <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : !data?.orders?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingCart className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum pedido encontrado</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.orders.map((order: any) => (
                      <TableRow key={order.orderId} data-testid={`row-order-${order.orderId}`}>
                        <TableCell className="font-mono text-xs">{order.orderId}</TableCell>
                        <TableCell className="text-sm">{formatDateTime(order.createdAt)}</TableCell>
                        <TableCell className="text-sm font-medium">{order.customerName ?? "---"}</TableCell>
                        <TableCell className="text-sm font-mono">{maskPhone(order.phone)}</TableCell>
                        <TableCell className="text-right font-medium text-sm">{formatCurrency(order.orderTotal)}</TableCell>
                        <TableCell className="text-sm">{paymentLabel(order.paymentMethod)}</TableCell>
                        <TableCell>{statusBadge(order.status)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedOrder(order)}
                            data-testid={`button-view-order-${order.orderId}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between gap-2 p-4 border-t">
                <p className="text-xs text-muted-foreground">
                  {data.total} pedido{data.total !== 1 ? "s" : ""} encontrado{data.total !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" disabled={page === 0} onClick={() => setPage(p => p - 1)} data-testid="button-prev-page">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs px-2">{page + 1} / {totalPages || 1}</span>
                  <Button variant="ghost" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} data-testid="button-next-page">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Detalhes do Pedido
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">ID</p>
                  <p className="font-mono">{selectedOrder.orderId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Data</p>
                  <p>{formatDateTime(selectedOrder.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Cliente</p>
                  <p className="font-medium">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Telefone</p>
                  <p className="font-mono">{maskPhone(selectedOrder.phone)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Pagamento</p>
                  <p>{paymentLabel(selectedOrder.paymentMethod)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  {statusBadge(selectedOrder.status)}
                </div>
              </div>

              {selectedOrder.deliveryAddress && (
                <div className="text-sm">
                  <p className="text-muted-foreground text-xs mb-1">Endereco de Entrega</p>
                  <p>{selectedOrder.deliveryAddress}</p>
                </div>
              )}

              {selectedOrder.itemsJson && (() => {
                try {
                  const items = JSON.parse(selectedOrder.itemsJson);
                  if (!Array.isArray(items) || items.length === 0) return null;
                  return (
                    <div>
                      <p className="text-muted-foreground text-xs mb-2">Itens</p>
                      <div className="space-y-2">
                        {items.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                            <span>{item.name || item.produto} x{item.quantity || item.quantidade}</span>
                            <span className="font-medium">{formatCurrency((item.price || item.preco) * (item.quantity || item.quantidade))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                } catch { return null; }
              })()}

              <div className="flex items-center justify-between pt-2 border-t">
                <span className="font-medium">Total</span>
                <span className="text-lg font-bold">{formatCurrency(selectedOrder.orderTotal)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users } from "lucide-react";

function maskPhone(phone: string | null) {
  if (!phone) return "---";
  if (phone.length < 8) return phone;
  return phone.slice(0, 4) + "****" + phone.slice(-4);
}

function formatCurrency(val: number | null) {
  if (val === null || val === undefined) return "R$ 0,00";
  return `R$ ${Number(val).toFixed(2).replace(".", ",")}`;
}

function formatDateTime(ts: string | null) {
  if (!ts) return "---";
  try {
    return new Date(ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch { return ts; }
}

function customerStatus(step: string | null) {
  if (step === "AGUARDANDO_HUMANO") {
    return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400">Aguardando</Badge>;
  }
  if (step === "PEDIDO_FINALIZADO") {
    return <Badge variant="secondary" className="bg-teal-500/10 text-teal-600 dark:text-teal-400">Ativo</Badge>;
  }
  return <Badge variant="secondary">Inativo</Badge>;
}

export default function CustomersPage() {
  const { data: customers, isLoading } = useQuery<any[]>({
    queryKey: ["/api/customers", "?limit=50"],
  });

  return (
    <div className="p-4 md:p-6 space-y-4 overflow-auto" data-testid="customers-page">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Clientes
        </h1>
        <p className="text-sm text-muted-foreground">Clientes unicos que interagiram com o bot</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : !customers?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum cliente encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="text-right">Sessoes</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Ultima Interacao</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer: any, idx: number) => (
                    <TableRow key={idx} data-testid={`row-customer-${idx}`}>
                      <TableCell className="text-sm font-medium">{customer.customer_name ?? "Desconhecido"}</TableCell>
                      <TableCell className="text-sm font-mono">{maskPhone(customer.phone)}</TableCell>
                      <TableCell className="text-right text-sm">{customer.total_sessoes ?? 0}</TableCell>
                      <TableCell className="text-right text-sm">{customer.total_pedidos ?? 0}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(customer.valor_total)}</TableCell>
                      <TableCell className="text-sm">{formatDateTime(customer.ultima_interacao)}</TableCell>
                      <TableCell>{customerStatus(customer.ultimo_step)}</TableCell>
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

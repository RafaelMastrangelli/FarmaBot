import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, MessageSquare, ShoppingCart, PhoneForwarded, Wifi } from "lucide-react";

function maskPhone(phone: string | null) {
  if (!phone) return "---";
  if (phone.length < 8) return phone;
  return phone.slice(0, 4) + "****" + phone.slice(-4);
}

function timeAgo(ts: string | null) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `ha ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `ha ${hours}h`;
  const days = Math.floor(hours / 24);
  return `ha ${days}d`;
}

interface EventItem {
  id: string;
  timestamp: string | null;
  phone: string | null;
  customerName: string | null;
  step: string | null;
  orderId: string | null;
  orderTotal: number | null;
  eventType: string | null;
}

function EventCard({ event }: { event: EventItem }) {
  const type = event.eventType ?? "MENSAGEM";
  const configs: Record<string, { icon: typeof MessageSquare; bg: string; label: string }> = {
    MENSAGEM: { icon: MessageSquare, bg: "bg-muted", label: "Mensagem" },
    PEDIDO_CRIADO: { icon: ShoppingCart, bg: "bg-teal-500/10 dark:bg-teal-400/10", label: "Pedido" },
    TRANSFERENCIA_HUMANO: { icon: PhoneForwarded, bg: "bg-amber-500/10 dark:bg-amber-400/10", label: "Transferencia" },
  };
  const config = configs[type] ?? configs.MENSAGEM;
  const Icon = config.icon;

  return (
    <div className={`rounded-md p-3 ${config.bg}`} data-testid={`card-event-${event.id}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{event.customerName ?? "Desconhecido"}</span>
            <Badge variant="secondary" className="text-[10px]">{config.label}</Badge>
            {event.orderId && (
              <Badge variant="secondary" className="text-[10px] bg-teal-500/10 text-teal-600 dark:text-teal-400">
                {event.orderId}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            <span>{maskPhone(event.phone)}</span>
            {event.step && <span>Step: {event.step}</span>}
            {event.orderTotal != null && (
              <span className="font-medium text-foreground">
                R$ {event.orderTotal.toFixed(2).replace(".", ",")}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{timeAgo(event.timestamp)}</p>
        </div>
      </div>
    </div>
  );
}

export default function ActivityPage() {
  const [filters, setFilters] = useState({
    MENSAGEM: true,
    PEDIDO_CRIADO: true,
    TRANSFERENCIA_HUMANO: true,
  });
  const [liveEvents, setLiveEvents] = useState<EventItem[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const { data: historicalEvents, isLoading } = useQuery<EventItem[]>({
    queryKey: ["/api/events", "?limit=100"],
  });

  useEffect(() => {
    const es = new EventSource("/api/events/live");
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.connected) return;
        setLiveEvents((prev) => [data, ...prev].slice(0, 200));
      } catch {}
    };
    es.onerror = () => setConnected(false);

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, []);

  const allEvents = [...liveEvents, ...(historicalEvents ?? [])];
  const uniqueEvents = allEvents.filter(
    (e, i, arr) => arr.findIndex((x) => x.id === e.id) === i
  );
  const filteredEvents = uniqueEvents.filter((e) => {
    const type = (e.eventType ?? "MENSAGEM") as keyof typeof filters;
    return filters[type] !== false;
  });

  const toggleFilter = (key: string) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  return (
    <div className="p-4 md:p-6 space-y-4 h-full flex flex-col" data-testid="activity-page">
      <div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Atividade em Tempo Real
          </h1>
          <p className="text-sm text-muted-foreground">Feed de eventos do bot</p>
        </div>
        <div className="flex items-center gap-2">
          <Wifi className={`w-4 h-4 ${connected ? "text-teal-500" : "text-muted-foreground"}`} />
          <span className="text-xs text-muted-foreground">{connected ? "Conectado" : "Desconectado"}</span>
        </div>
      </div>

      <Card className="shrink-0">
        <CardContent className="p-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-xs text-muted-foreground">Filtros:</span>
            {[
              { key: "MENSAGEM", label: "Mensagens" },
              { key: "PEDIDO_CRIADO", label: "Pedidos" },
              { key: "TRANSFERENCIA_HUMANO", label: "Transferencias" },
            ].map((f) => (
              <label key={f.key} className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  checked={filters[f.key as keyof typeof filters]}
                  onCheckedChange={() => toggleFilter(f.key)}
                  data-testid={`checkbox-filter-${f.key}`}
                />
                <span className="text-sm">{f.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Activity className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum evento encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">Os eventos aparecerão aqui em tempo real</p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-2 pr-3">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

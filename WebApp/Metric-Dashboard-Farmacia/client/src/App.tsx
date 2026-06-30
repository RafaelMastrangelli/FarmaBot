import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import LoginPage from "@/pages/login";
import OverviewPage from "@/pages/overview";
import OrdersPage from "@/pages/orders";
import ActivityPage from "@/pages/activity";
import AbandonmentPage from "@/pages/abandonment";
import CustomersPage from "@/pages/customers";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={OverviewPage} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/activity" component={ActivityPage} />
      <Route path="/abandonment" component={AbandonmentPage} />
      <Route path="/customers" component={CustomersPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function DashboardLayout() {
  const style = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center gap-2 p-2 border-b shrink-0 bg-card/80 backdrop-blur-sm">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AuthGate() {
  const { authenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-3 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginPage />;
  }

  return <DashboardLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

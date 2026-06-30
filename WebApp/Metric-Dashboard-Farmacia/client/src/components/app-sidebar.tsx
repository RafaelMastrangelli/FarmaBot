import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ShoppingCart,
  Activity,
  UserX,
  Users,
  Pill,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

const navItems = [
  { title: "Visao Geral", url: "/", icon: LayoutDashboard },
  { title: "Pedidos", url: "/orders", icon: ShoppingCart },
  { title: "Atividade", url: "/activity", icon: Activity },
  { title: "Desistencias", url: "/abandonment", icon: UserX },
  { title: "Clientes", url: "/customers", icon: Users },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { logout, username } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-sm leading-none">FarmaBot</p>
            <p className="text-xs text-sidebar-foreground/60 mt-0.5">Dashboard</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    data-active={location === item.url}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.url.replace("/", "") || "home"}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-sidebar-foreground/60 truncate">{username}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

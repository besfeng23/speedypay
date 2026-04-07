"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ArrowRightLeft,
  Banknote,
  FileClock,
  Settings,
  Beaker,
  Building,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { NavItem, Role } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";

const allNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Tenants", href: "/tenants", icon: Building },
  { title: "Merchants", href: "/merchants", icon: Users },
  { title: "Transactions", href: "/transactions", icon: ArrowRightLeft },
  { title: "Settlements", href: "/settlements", icon: Banknote },
  { title: "Audit Logs", href: "/audit-logs", icon: FileClock },
  { title: "Testing", href: "/testing", icon: Beaker },
  { title: "Settings", href: "/settings", icon: Settings },
];

const rolePermissions: Record<Role, string[]> = {
    super_admin: allNavItems.map(i => i.href),
    platform_admin: allNavItems.map(i => i.href),
    speedypay_ops: allNavItems.map(i => i.href),
    tenant_admin: ['/dashboard', '/merchants', '/transactions', '/settlements'],
    finance_ops: ['/dashboard', '/transactions', '/settlements', '/audit-logs'],
    compliance_ops: ['/tenants', '/merchants', '/audit-logs'],
    read_only_auditor: ['/audit-logs', '/transactions', '/settlements'],
};


export function SidebarNav({ isCollapsed }: { isCollapsed: boolean }) {
  const pathname = usePathname();
  const { role } = useAuth();
  
  const accessibleHrefs = role ? rolePermissions[role] : [];
  const navItems = allNavItems.filter(item => accessibleHrefs.includes(item.href));

  return (
    <TooltipProvider delayDuration={0}>
      <nav className="grid gap-2 px-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return isCollapsed ? (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="icon"
                    className="h-10 w-10"
                    aria-label={item.title}
                  >
                    <item.icon className="h-5 w-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-4">
                {item.title}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start h-10 text-base"
              >
                <item.icon className="mr-4 h-5 w-5" />
                {item.title}
              </Button>
            </Link>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}

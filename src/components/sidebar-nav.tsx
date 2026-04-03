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
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { NavItem } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip";

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Merchants", href: "/merchants", icon: Users },
  { title: "Transactions", href: "/transactions", icon: ArrowRightLeft },
  { title: "Settlements", href: "/settlements", icon: Banknote },
  { title: "Audit Logs", href: "/audit-logs", icon: FileClock },
  { title: "Testing", href: "/testing", icon: Beaker },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function SidebarNav({ isCollapsed }: { isCollapsed: boolean }) {
  const pathname = usePathname();

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

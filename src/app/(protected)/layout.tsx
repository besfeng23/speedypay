"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SidebarNav } from "@/components/sidebar-nav";
import { UserNav } from "@/components/user-nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  Menu,
  Home,
  Users,
  ArrowRightLeft,
  Banknote,
  FileClock,
  Settings,
  AlertTriangle,
  Beaker,
  Server,
  Building,
} from "lucide-react";
import { Icons } from "@/components/icons";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { user, loading, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || !role)) {
      router.push(`/login?redirect=${pathname}`);
    }
  }, [user, loading, role, router, pathname]);

  if (loading || !user || !role) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
            <Icons.logo className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }

  const isDemoMode = user?.uid === 'mock-user-id';
  const isLiveEnv = process.env.NEXT_PUBLIC_SPEEDYPAY_ENV === 'production';

  return (
    <div className="min-h-screen w-full">
      <div
        className={cn(
          "hidden md:flex md:flex-col md:fixed md:inset-y-0 z-50 h-full border-r bg-card transition-all",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className="flex h-16 items-center border-b px-4 lg:px-6 shrink-0">
          <Link href="/" className={cn("flex items-center gap-2 font-semibold", isCollapsed && "justify-center w-full")}>
            <Icons.logo className="h-6 w-6 text-primary" />
            {!isCollapsed && <span className="">SpeedyPay</span>}
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-4">
          <SidebarNav isCollapsed={isCollapsed} />
        </div>
        <div className="mt-auto p-4 border-t flex justify-center">
            <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className={cn(
                            "h-9 w-9 transition-transform",
                            isCollapsed && "rotate-180"
                            )}
                            aria-label="Toggle sidebar"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p>{isCollapsed ? "Expand" : "Collapse"}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      </div>
      <div
        className={cn(
          "flex flex-col transition-all",
          isCollapsed ? "md:pl-20" : "md:pl-64"
        )}
      >
        <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 sticky top-0 z-40">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0 max-w-xs">
               <div className="flex h-16 items-center border-b px-6 shrink-0">
                 <Link href="/" className="flex items-center gap-2 font-semibold">
                    <Icons.logo className="h-6 w-6 text-primary" />
                    <span className="">SpeedyPay</span>
                </Link>
               </div>
              <nav className="grid gap-2 text-base font-medium p-4">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  <Home className="h-5 w-5" />
                  Dashboard
                </Link>
                <Link
                  href="/tenants"
                  className="flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  <Building className="h-5 w-5" />
                  Tenants
                </Link>
                <Link
                  href="/merchants"
                  className="flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  <Users className="h-5 w-5" />
                  Merchants
                </Link>
                <Link
                  href="/transactions"
                  className="flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  <ArrowRightLeft className="h-5 w-5" />
                  Transactions
                </Link>
                <Link
                  href="/settlements"
                  className="flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  <Banknote className="h-5 w-5" />
                  Settlements
                </Link>
                <Link
                    href="/audit-logs"
                    className="flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                    <FileClock className="h-5 w-5" />
                    Audit Logs
                </Link>
                 <Link
                    href="/testing"
                    className="flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                    <Beaker className="h-5 w-5" />
                    Testing
                </Link>
                <Link
                    href="/settings"
                    className="flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                    <Settings className="h-5 w-5" />
                    Settings
                </Link>
              </nav>
            </SheetContent>
          </Sheet>

          <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
            <div className="ml-auto flex items-center gap-2 sm:flex-initial">
              {isDemoMode && (
                <Badge variant="outline" className="hidden sm:flex items-center gap-2 border-orange-500/50 text-orange-600 bg-orange-500/10">
                    <AlertTriangle className="h-3 w-3" />
                    Auth: Demo Mode
                </Badge>
              )}
               <Badge variant={isLiveEnv ? 'destructive' : 'secondary'} className="hidden sm:flex items-center gap-2">
                {isLiveEnv ? <Server className="h-3 w-3" /> : <Beaker className="h-3 w-3" />}
                Env: {isLiveEnv ? 'Live' : 'Test'}
              </Badge>
            </div>
            <UserNav />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}

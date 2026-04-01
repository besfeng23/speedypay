"use client";

import React, { useState } from "react";
import { SidebarNav } from "@/components/sidebar-nav";
import { UserNav } from "@/components/user-nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
} from "lucide-react";
import { Icons } from "@/components/icons";
import Link from "next/link";
import { DemoPaymentSimulator } from "@/components/demo-payment-simulator";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen w-full">
      <div
        className={cn(
          "hidden md:flex md:flex-col md:fixed md:inset-y-0 z-50 h-full border-r bg-card transition-all",
          isCollapsed ? "w-14" : "w-64"
        )}
      >
        <div className="flex h-16 items-center border-b px-4 lg:px-6 shrink-0">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Icons.logo className="h-6 w-6 text-primary" />
            {!isCollapsed && <span className="">SpeedyPay</span>}
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-4">
          <SidebarNav isCollapsed={isCollapsed} />
        </div>
        <div className="mt-auto p-4 border-t">
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
        </div>
      </div>
      <div
        className={cn(
          "flex flex-col transition-all",
          isCollapsed ? "md:pl-14" : "md:pl-64"
        )}
      >
        <header className="flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6 sticky top-0 z-40">
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
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  href="#"
                  className="flex items-center gap-2 text-lg font-semibold mb-4"
                >
                  <Icons.logo className="h-6 w-6 text-primary" />
                  <span className="">SpeedyPay</span>
                </Link>
                <Link
                  href="/dashboard"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  <Home className="h-5 w-5" />
                  Dashboard
                </Link>
                <Link
                  href="/merchants"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  <Users className="h-5 w-5" />
                  Merchants
                </Link>
                <Link
                  href="/transactions"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  <ArrowRightLeft className="h-5 w-5" />
                  Transactions
                </Link>
                <Link
                  href="/settlements"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  <Banknote className="h-5 w-5" />
                  Settlements
                </Link>
                <Link
                    href="/audit-logs"
                    className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                    <FileClock className="h-5 w-5" />
                    Audit Logs
                </Link>
                <Link
                    href="/settings"
                    className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                    <Settings className="h-5 w-5" />
                    Settings
                </Link>
              </nav>
            </SheetContent>
          </Sheet>

          <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
            <div className="ml-auto flex-1 sm:flex-initial">
              {/* Future search bar */}
            </div>
            <DemoPaymentSimulator />
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

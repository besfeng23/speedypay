'use client';

import { DollarSign, Users, Activity, Banknote, RefreshCw, AlertCircle, Building } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getDashboardStats } from "@/lib/data";
import type { ChartConfig } from "@/components/ui/chart";
import { DashboardChart } from "@/components/dashboard-chart";
import { RecentActivity } from "@/components/recent-activity";
import { DemoPaymentSimulator } from "@/components/demo-payment-simulator";
import { DashboardInsights } from "@/components/dashboard-insights";
import { getMerchants } from "@/lib/data";
import { useEffect, useState } from "react";
import type { DashboardStats, Merchant } from "@/lib/types";


const chartData = [
  { month: "January", volume: 18600, fees: 800 },
  { month: "February", volume: 30500, fees: 1200 },
  { month: "March", volume: 23700, fees: 950 },
  { month: "April", volume: 27800, fees: 1100 },
  { month: "May", volume: 18900, fees: 850 },
  { month: "June", volume: 23900, fees: 1000 },
];

const chartConfig = {
  volume: {
    label: "Gross Volume",
    color: "hsl(var(--chart-1))",
  },
  fees: {
    label: "Platform Fees",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const formatCurrency = (amount: number, currency: string = "PHP") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);

   useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [statsData, merchantsData] = await Promise.all([
        getDashboardStats(),
        getMerchants(),
      ]);
      setStats(statsData);
      setMerchants(merchantsData);
      setLoading(false);
    }
    fetchData();
  }, []);


  if (loading || !stats) {
    return (
       <div className="grid gap-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="h-[126px] animate-pulse bg-muted" />
            <Card className="h-[126px] animate-pulse bg-muted" />
            <Card className="h-[126px] animate-pulse bg-muted" />
            <Card className="h-[126px] animate-pulse bg-muted" />
        </div>
        <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3 h-[400px] animate-pulse bg-muted" />
            <div className="lg:col-span-2">
                <Card className="h-[400px] animate-pulse bg-muted" />
            </div>
        </div>
      </div>
    );
  }
  
  const kpiDataForAI = {
      totalGrossVolume: stats.totalGrossVolume,
      totalPlatformFees: stats.totalPlatformFees,
      totalMerchantNetRemittances: stats.totalMerchantNetRemittances,
      pendingSettlements: stats.pendingSettlements,
      failedSettlements: stats.failedSettlements,
      activeMerchants: stats.activeMerchants,
      recentTransactionsCount: stats.recentTransactionsCount,
      recentSettlementEventsCount: stats.recentSettlementEventsCount,
      currency: 'PHP',
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="An executive overview of your marketplace's performance."
      >
        <DemoPaymentSimulator merchants={merchants} />
      </PageHeader>
      <div className="grid gap-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Gross Volume"
            value={formatCurrency(stats.totalGrossVolume, 'PHP')}
            icon={<DollarSign />}
            description="Total value of all successful payments."
          />
          <StatCard
            title="Platform Fees Earned"
            value={formatCurrency(stats.totalPlatformFees, 'PHP')}
            icon={<Activity />}
            description="Your total revenue from transaction fees."
          />
           <StatCard
            title="Merchant Net Payouts"
            value={formatCurrency(stats.totalMerchantNetRemittances, 'PHP')}
            icon={<Banknote />}
            description="Total net amount successfully paid out."
          />
           <StatCard
            title="Active Merchants"
            value={`${stats.activeMerchants}`}
            icon={<Users />}
            description="Merchants with a completed onboarding."
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Collections</CardTitle>
                    <CardDescription>Status of incoming funds from customers.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                     <StatCard
                        title="Processing"
                        value={`${stats.processingPayments}`}
                        icon={<RefreshCw className="text-blue-500" />}
                        description="Payments currently in-process."
                        className="shadow-none border"
                    />
                    <StatCard
                        title="Failed"
                        value={`${stats.failedPayments}`}
                        icon={<AlertCircle className="text-red-500" />}
                        description="Payments that have failed or expired."
                        className="shadow-none border"
                    />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Payouts</CardTitle>
                    <CardDescription>Status of outgoing funds to merchants.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                     <StatCard
                        title="Pending"
                        value={`${stats.pendingSettlements}`}
                        icon={<RefreshCw className="text-yellow-500" />}
                        description="Internal settlements awaiting payout."
                        className="shadow-none border"
                    />
                    <StatCard
                        title="Failed"
                        value={`${stats.failedSettlements}`}
                        icon={<AlertCircle className="text-red-500" />}
                        description="Remittances that failed at the provider."
                        className="shadow-none border"
                    />
                </CardContent>
            </Card>
        </div>
        
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Financial Overview</CardTitle>
              <CardDescription>A summary of gross volume vs. platform fees over time.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <DashboardChart data={chartData} config={chartConfig} />
            </CardContent>
          </Card>
          <div className="lg:col-span-2">
            <RecentActivity merchants={merchants} />
          </div>
        </div>
        
        <div>
            <DashboardInsights kpiData={kpiDataForAI} />
        </div>
      </div>
    </>
  );
}

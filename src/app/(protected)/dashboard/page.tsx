import { DollarSign, Users, Activity, Banknote, RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getDashboardStats } from "@/lib/data";
import type { ChartConfig } from "@/components/ui/chart";
import { DashboardChart } from "@/components/dashboard-chart";
import { RecentActivity } from "@/components/recent-activity";
import { DemoPaymentSimulator } from "@/components/demo-payment-simulator";
import { DashboardInsights } from "@/components/dashboard-insights";
import { getRecentPayments, getRecentSettlements } from "@/lib/data";

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

export default async function Dashboard() {
  const stats = await getDashboardStats();
  const recentPayments = await getRecentPayments();
  const recentSettlements = await getRecentSettlements();


  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };
  
  const kpiDataForAI = {
      totalGrossVolume: stats.totalGrossVolume,
      totalPlatformFees: stats.totalPlatformFees,
      totalMerchantNetRemittances: stats.totalMerchantNetRemittances,
      pendingSettlements: stats.pendingSettlements,
      failedSettlements: stats.failedSettlements,
      activeMerchants: stats.activeMerchants,
      recentTransactionsCount: recentPayments.length,
      recentSettlementEventsCount: recentSettlements.length,
      currency: 'PHP',
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Here’s a snapshot of your marketplace performance."
      >
        <DemoPaymentSimulator />
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
            title="Merchant Net Remittances"
            value={formatCurrency(stats.totalMerchantNetRemittances, 'PHP')}
            icon={<Banknote />}
            description="Total net amount successfully paid out."
          />
          <StatCard
            title="Active Merchants"
            value={`${stats.activeMerchants}`}
            icon={<Users />}
            description="Merchants actively transacting."
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
                title="Processing Payments"
                value={`${stats.processingPayments}`}
                icon={<RefreshCw />}
                description="Collections currently in-process with the provider."
            />
             <StatCard
                title="Failed Payments"
                value={`${stats.failedPayments}`}
                icon={<AlertCircle />}
                description="Collections that have failed or were cancelled."
            />
            <StatCard
                title="Pending Settlements"
                value={`${stats.pendingSettlements}`}
                icon={<RefreshCw />}
                description="Internal settlements awaiting payout initiation."
            />
             <StatCard
                title="Failed Payouts"
                value={`${stats.failedSettlements}`}
                icon={<AlertCircle />}
                description="Payouts that failed at the provider."
            />
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
            <RecentActivity />
          </div>
        </div>
        
        <div>
            <DashboardInsights kpiData={kpiDataForAI} />
        </div>
      </div>
    </>
  );
}

import { DollarSign, Users, Activity, Banknote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getDashboardStats } from "@/lib/data";
import type { ChartConfig } from "@/components/ui/chart";
import { DashboardChart } from "@/components/dashboard-chart";
import { DashboardInsights } from "@/components/dashboard-insights";
import { RecentActivity } from "@/components/recent-activity";

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const kpiData = {
    totalGrossVolume: stats.totalGrossVolume,
    totalPlatformFees: stats.totalPlatformFees,
    totalMerchantNetRemittances: stats.totalMerchantNetRemittances,
    pendingSettlements: stats.pendingSettlements,
    failedSettlements: stats.failedSettlements,
    activeMerchants: stats.activeMerchants,
    recentTransactionsCount: 243, // Example data
    recentSettlementEventsCount: 89, // Example data
    currency: "USD",
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Here’s a snapshot of your marketplace performance."
      />
      <div className="grid gap-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Gross Volume"
            value={formatCurrency(stats.totalGrossVolume)}
            icon={<DollarSign />}
            description="Total value of all payments processed."
          />
          <StatCard
            title="Platform Fees Earned"
            value={formatCurrency(stats.totalPlatformFees)}
            icon={<Activity />}
            description="Your total revenue from transaction fees."
          />
          <StatCard
            title="Merchant Net Remittances"
            value={formatCurrency(stats.totalMerchantNetRemittances)}
            icon={<Banknote />}
            description="Total net amount paid out to merchants."
          />
          <StatCard
            title="Active Merchants"
            value={`${stats.activeMerchants}`}
            icon={<Users />}
            description="Merchants actively transacting on the platform."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Overview</CardTitle>
                <CardDescription>Monthly gross volume and platform fees.</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <DashboardChart data={chartData} config={chartConfig} />
              </CardContent>
            </Card>
            <DashboardInsights kpiData={kpiData} />
          </div>
          <div className="lg:col-span-2">
            <RecentActivity />
          </div>
        </div>
      </div>
    </>
  );
}

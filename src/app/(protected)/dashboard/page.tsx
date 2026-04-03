import { DollarSign, Users, Activity, Banknote, RefreshCw, AlertCircle, Building, HandCoins } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";

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


  const formatCurrency = (amount: number, currency: string = "PHP") => {
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
        description="An executive overview of your marketplace's performance."
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

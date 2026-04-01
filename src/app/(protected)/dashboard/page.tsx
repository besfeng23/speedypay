import {
  DollarSign,
  Users,
  CreditCard,
  Activity,
  AlertCircle,
  Banknote,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import {
  getDashboardStats,
  getRecentPayments,
  getRecentSettlements,
} from "@/lib/data";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Welcome to your SpeedyPay Marketplace Console."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Gross Volume"
          value={formatCurrency(stats.totalGrossVolume)}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          description="+20.1% from last month"
        />
        <StatCard
          title="Platform Fees Earned"
          value={formatCurrency(stats.totalPlatformFees)}
          icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
          description="+18.3% from last month"
        />
        <StatCard
          title="Active Merchants"
          value={`+${stats.activeMerchants}`}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          description="+5 since last month"
        />
        <StatCard
          title="Pending Settlements"
          value={stats.pendingSettlements.toString()}
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
          description={`${stats.failedSettlements} failed`}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="volume" fill="var(--color-volume)" radius={4} />
                <Bar dataKey="fees" fill="var(--color-fees)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              A log of the most recent payments processed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className="font-medium">{payment.customerName}</div>
                      <div className="hidden text-sm text-muted-foreground md:inline">
                        {payment.customerEmail}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={payment.paymentStatus} />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(payment.grossAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

import { getRecentPayments, getRecentSettlements } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { ArrowRightLeft, CreditCard } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { StatusBadge } from "./status-badge";

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(amount);
};

export async function RecentActivity() {
    const recentPayments = await getRecentPayments(4);
    const recentSettlements = await getRecentSettlements(4);

    const combinedActivity = [
        ...recentPayments.map(p => ({...p, type: 'payment' as const})),
        ...recentSettlements.map(s => ({...s, type: 'settlement' as const}))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>A feed of recent payments and settlements.</CardDescription>
            </CardHeader>
            <CardContent>
                {combinedActivity.length > 0 ? (
                    <div className="space-y-6">
                        {combinedActivity.slice(0, 7).map(item => (
                            <div key={`${item.type}-${item.id}`} className="flex items-center gap-4">
                                <div className="p-2 bg-secondary rounded-full">
                                    {item.type === 'payment' ? <CreditCard className="h-4 w-4 text-muted-foreground" /> : <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />}
                                </div>
                                <div className="flex-1 text-sm">
                                    {item.type === 'payment' && (
                                        <>
                                            <p>Payment from <span className="font-medium">{item.customerName}</span></p>
                                            <p className="text-xs text-muted-foreground">
                                                <Link href={`/transactions/${item.id}`} className="hover:underline">{formatCurrency(item.grossAmount)}</Link>
                                                <span className="mx-1">•</span>
                                                <StatusBadge status={item.paymentStatus} />
                                            </p>
                                        </>
                                    )}
                                    {item.type === 'settlement' && (
                                        <>
                                            <p>Settlement to <span className="font-medium">{item.merchantId}</span></p>
                                            <p className="text-xs text-muted-foreground">
                                                <Link href={`/settlements/${item.id}`} className="hover:underline">{formatCurrency(item.merchantNetAmount)}</Link>
                                                <span className="mx-1">•</span>
                                                <StatusBadge status={item.settlementStatus} />
                                            </p>
                                        </>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground text-right">
                                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-sm text-muted-foreground py-8">
                        No recent activity found.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

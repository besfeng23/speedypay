'use client';

import { getRecentPayments, getRecentSettlements } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Activity, ArrowRightLeft, CreditCard } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { StatusBadge } from "./status-badge";
import type { Merchant, Payment, Settlement } from "@/lib/types";
import { EmptyState } from "./empty-state";
import { useEffect, useState } from "react";
import { Skeleton } from "./ui/skeleton";

const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
    }).format(amount);
};

type ActivityItem = (Payment & { type: 'payment' }) | (Settlement & { type: 'settlement' });

export function RecentActivity({ merchants }: { merchants: Merchant[] }) {
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        async function fetchActivity() {
            setLoading(true);
            const [recentPayments, recentSettlements] = await Promise.all([
                getRecentPayments(5),
                getRecentSettlements(5)
            ]);
            
            const combinedActivity = [
                ...recentPayments.map(p => ({...p, type: 'payment' as const})),
                ...recentSettlements.map(s => ({...s, type: 'settlement' as const}))
            ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setActivity(combinedActivity);
            setLoading(false);
        }
        if (merchants.length > 0) {
            fetchActivity();
        }
    }, [merchants]);

    if (loading) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>A live feed of the latest transactions and settlements.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </CardContent>
            </Card>
        )
    }
    
    const merchantMap = new Map(merchants.map(m => [m.id, m.displayName]));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                 <CardDescription>A live feed of the latest transactions and settlements.</CardDescription>
            </CardHeader>
            <CardContent>
                {activity.length > 0 ? (
                    <div className="space-y-6">
                        {activity.slice(0, 5).map(item => (
                            <div key={`${item.type}-${item.id}`} className="flex items-center gap-4">
                                <div className="p-2 bg-secondary rounded-full">
                                    {item.type === 'payment' ? <CreditCard className="h-4 w-4 text-muted-foreground" /> : <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />}
                                </div>
                                <div className="flex-1 text-sm">
                                    {item.type === 'payment' && 'customerName' in item && (
                                        <>
                                            <div>Payment from <span className="font-medium">{item.customerName}</span></div>
                                            <div className="text-xs text-muted-foreground">For {merchantMap.get(item.merchantId) || 'Unknown'}</div>
                                        </>
                                    )}
                                    {item.type === 'settlement' && (
                                        <>
                                            <div>Settlement for <span className="font-medium">{merchantMap.get(item.merchantId) || 'Unknown'}</span></div>
                                            <div className="text-xs text-muted-foreground">
                                                <StatusBadge status={item.settlementStatus} />
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="font-mono text-sm">{formatCurrency(item.type === 'payment' && 'grossAmount' in item ? item.grossAmount : item.merchantNetAmount)}</div>
                                    <div className="text-xs text-muted-foreground">
                                        <Link href={item.type === 'payment' ? `/transactions/${item.id}` : `/settlements/${item.id}`} className="hover:underline">
                                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState 
                        icon={<Activity />}
                        title="No Activity Yet"
                        description="As payments and settlements occur, they will appear here."
                        className="py-1"
                    />
                )}
            </CardContent>
        </Card>
    );
}

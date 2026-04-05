export const dynamic = 'force-dynamic';

import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { getSettlements, getMerchants } from "@/lib/data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import type { Settlement, Merchant } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { Banknote } from "lucide-react";

export default async function SettlementsPage() {
  const settlements: Settlement[] = await getSettlements();
  const merchants: Merchant[] = await getMerchants();
  const merchantMap = new Map(merchants.map(m => [m.id, m.displayName]));

  const formatCurrency = (amount: number, currency: string = 'PHP') => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  return (
    <>
      <PageHeader
        title="Settlements"
        description="Monitor all settlement and remittance activities."
      />
      <Card>
         <CardHeader>
            <CardTitle>All Settlements</CardTitle>
            <CardDescription>This table shows all internal settlements and their corresponding payout status.</CardDescription>
        </CardHeader>
        <CardContent>
           {settlements.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[150px]">Settlement ID</TableHead>
                            <TableHead>Merchant</TableHead>
                            <TableHead className="text-right">Net Amount</TableHead>
                            <TableHead>Settlement Status</TableHead>
                            <TableHead>Remittance Status</TableHead>
                            <TableHead className="hidden sm:table-cell">Date</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {settlements.map((settlement) => (
                            <TableRow key={settlement.id}>
                                <TableCell className="font-mono text-sm">
                                    <Link href={`/settlements/${settlement.id}`} className="hover:underline">
                                        {settlement.id}
                                    </Link>
                                    <div className="text-xs text-muted-foreground font-sans">
                                        From: <Link href={`/transactions/${settlement.paymentId}`} className="hover:underline font-medium text-primary">{settlement.paymentId}</Link>
                                    </div>
                                </TableCell>
                                <TableCell>{merchantMap.get(settlement.merchantId) || 'Unknown'}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(settlement.merchantNetAmount, settlement.currency)}</TableCell>
                                <TableCell><StatusBadge status={settlement.settlementStatus} /></TableCell>
                                <TableCell><StatusBadge status={settlement.remittanceStatus} /></TableCell>
                                <TableCell className="hidden sm:table-cell">{format(new Date(settlement.createdAt), 'MMM d, yyyy')}</TableCell>
                                <TableCell className="text-right">
                                    <Link href={`/settlements/${settlement.id}`}>
                                        <Button variant="outline" size="sm">Details</Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                 <EmptyState
                    icon={<Banknote />}
                    title="No Settlements"
                    description="No settlement records have been created yet."
                />
            )}
        </CardContent>
      </Card>
    </>
  );
}

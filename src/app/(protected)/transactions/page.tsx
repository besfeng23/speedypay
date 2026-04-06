export const dynamic = 'force-dynamic';

import Link from "next/link";
import { format } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { getPayments, getMerchants, getTenants } from "@/lib/data";
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
import type { Payment, Merchant, Tenant } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { ArrowRightLeft } from "lucide-react";
import { CreatePaymentDialog } from "@/components/create-payment-dialog";
import { Button } from "@/components/ui/button";

export default async function TransactionsPage() {
  const [payments, merchants, tenants] = await Promise.all([getPayments(), getMerchants(), getTenants()]);
  
  const merchantMap = new Map(merchants.map(m => [m.id, m.displayName]));
  const tenantMap = new Map(tenants.map(t => [t.id, t.name]));

  const formatCurrency = (amount: number, currency: string = "PHP") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  return (
    <>
      <PageHeader
        title="Transactions"
        description="View and manage all payment transactions."
      >
        <CreatePaymentDialog merchants={merchants} tenants={tenants} />
      </PageHeader>
      <Card>
        <CardHeader>
            <CardTitle>All Payments</CardTitle>
            <CardDescription>A complete log of all payments received by the platform.</CardDescription>
        </CardHeader>
        <CardContent>
            {payments.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer / Desc</TableHead>
                            <TableHead className="hidden lg:table-cell">Tenant</TableHead>
                            <TableHead className="hidden md:table-cell">Merchant</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="hidden sm:table-cell">Payment Status</TableHead>
                            <TableHead className="hidden md:table-cell">Settlement Status</TableHead>
                            <TableHead className="hidden sm:table-cell">Date</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payments.map((payment) => (
                            <TableRow key={payment.id}>
                                <TableCell className="font-medium">
                                    <Link href={`/transactions/${payment.id}`} className="hover:underline">
                                        {payment.customerName !== 'N/A (Generated Link)' ? payment.customerName : payment.id}
                                    </Link>
                                    <div className="text-sm text-muted-foreground">{payment.bookingReferenceOrInvoiceReference}</div>
                                </TableCell>
                                 <TableCell className="hidden lg:table-cell">
                                    <Link href={`/tenants/${payment.tenantId}`} className="hover:underline">
                                        {tenantMap.get(payment.tenantId) || 'Unknown'}
                                    </Link>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">{merchantMap.get(payment.merchantId) || 'Unknown'}</TableCell>
                                <TableCell className="text-right font-mono text-sm">{formatCurrency(payment.grossAmount)}</TableCell>
                                <TableCell className="hidden sm:table-cell"><StatusBadge status={payment.paymentStatus} /></TableCell>
                                <TableCell className="hidden md:table-cell"><StatusBadge status={payment.settlementStatus} /></TableCell>
                                <TableCell className="hidden sm:table-cell">{format(new Date(payment.createdAt), 'MMM d, yyyy')}</TableCell>
                                <TableCell className="text-right">
                                    <Link href={`/transactions/${payment.id}`}>
                                        <Button variant="outline" size="sm">Details</Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <EmptyState
                    icon={<ArrowRightLeft />}
                    title="No Transactions"
                    description="No payments have been processed yet."
                />
            )}
        </CardContent>
      </Card>
    </>
  );
}

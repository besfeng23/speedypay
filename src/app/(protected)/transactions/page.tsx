import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { getPayments, getMerchants } from "@/lib/data";
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
import type { Payment, Merchant } from "@/lib/types";

export default async function TransactionsPage() {
  const payments: Payment[] = await getPayments();
  const merchants: Merchant[] = await getMerchants();
  const merchantMap = new Map(merchants.map(m => [m.id, m.displayName]));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <>
      <PageHeader
        title="Transactions"
        description="View and manage all payment transactions."
      />
      <Card>
        <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>A complete log of all payments processed through the system.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Merchant</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead>Settlement Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {payments.map((payment) => (
                        <TableRow key={payment.id}>
                            <TableCell className="font-medium">
                                <Link href={`/transactions/${payment.id}`} className="hover:underline">
                                    {payment.customerName}
                                </Link>
                                <div className="text-sm text-muted-foreground">{payment.bookingReferenceOrInvoiceReference}</div>
                            </TableCell>
                            <TableCell>{merchantMap.get(payment.merchantId) || 'Unknown'}</TableCell>
                            <TableCell className="text-right">{formatCurrency(payment.grossAmount)}</TableCell>
                            <TableCell><StatusBadge status={payment.paymentStatus} /></TableCell>
                            <TableCell><StatusBadge status={payment.settlementStatus} /></TableCell>
                            <TableCell>{format(new Date(payment.createdAt), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="text-right">
                                <Link href={`/transactions/${payment.id}`}>
                                    <Button variant="outline" size="sm">Details</Button>
                                </Link>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </>
  );
}

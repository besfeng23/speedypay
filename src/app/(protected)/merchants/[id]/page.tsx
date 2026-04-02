import { getMerchantById, getPaymentsByMerchantId, getSettlementsByMerchantId } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Payment, Settlement } from "@/lib/types";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { payoutChannelMap } from "@/lib/speedypay/payout-channels";

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 items-start gap-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm col-span-2 font-medium">{value}</dd>
    </div>
  );
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
};


function RecentTransactions({ transactions }: { transactions: Payment[] }) {
    if (transactions.length === 0) {
        return <p className="text-sm text-muted-foreground py-4">No recent transactions found.</p>;
    }
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                        <TableCell>
                            <Link href={`/transactions/${tx.id}`} className="font-medium hover:underline">{tx.customerName}</Link>
                            <div className="text-xs text-muted-foreground">{format(new Date(tx.createdAt), "PP")}</div>
                        </TableCell>
                        <TableCell><StatusBadge status={tx.paymentStatus} /></TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(tx.grossAmount)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

function RecentSettlements({ settlements }: { settlements: Settlement[] }) {
    if (settlements.length === 0) {
        return <p className="text-sm text-muted-foreground py-4">No recent settlements found.</p>;
    }
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Settlement ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Net Amount</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {settlements.map((s) => (
                    <TableRow key={s.id}>
                        <TableCell>
                            <Link href={`/settlements/${s.id}`} className="font-mono text-xs hover:underline">{s.id}</Link>
                             <div className="text-xs text-muted-foreground font-sans">{format(new Date(s.createdAt), "PP")}</div>
                        </TableCell>
                        <TableCell><StatusBadge status={s.settlementStatus} /></TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(s.merchantNetAmount)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}


export default async function MerchantDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const merchant = await getMerchantById(params.id);

  if (!merchant) {
    notFound();
  }

  const recentTransactions = await getPaymentsByMerchantId(merchant.id, 5);
  const recentSettlements = await getSettlementsByMerchantId(merchant.id, 5);
  const payoutChannel = payoutChannelMap.get(merchant.defaultPayoutChannel);

  return (
    <>
      <PageHeader
        title={merchant.displayName}
        description={`Details for merchant ID: ${merchant.id}`}
      >
        <Button variant="outline">
            <Pencil />
            Edit Merchant
        </Button>
      </PageHeader>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Core legal and contact details for this merchant.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                <DetailItem label="Business Name" value={merchant.businessName} />
                <DetailItem label="Display Name" value={merchant.displayName} />
                <DetailItem label="Contact Name" value={merchant.contactName} />
                <DetailItem label="Contact Email" value={<a href={`mailto:${merchant.email}`} className="text-primary hover:underline">{merchant.email}</a>} />
                <DetailItem label="Mobile" value={merchant.mobile} />
                <DetailItem label="Created At" value={format(new Date(merchant.createdAt), "PPP p")} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payout & Fee Configuration</CardTitle>
              <CardDescription>Settings for how this merchant receives funds and how fees are applied.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                <DetailItem label="Default Payout Channel" value={<div className="flex flex-col"><Badge variant="secondary" className="w-fit">{payoutChannel?.description || merchant.defaultPayoutChannel}</Badge><span className="text-xs text-muted-foreground font-mono mt-1">{merchant.defaultPayoutChannel}</span></div>} />
                <DetailItem label="Recipient Account Name" value={merchant.settlementAccountName} />
                <DetailItem label="Recipient Account Number" value={merchant.settlementAccountNumberOrWalletId} />
                <DetailItem label="Default Fee Type" value={<Badge variant="outline" className="capitalize">{merchant.defaultFeeType}</Badge>} />
                <DetailItem label="Default Fee Value" value={merchant.defaultFeeType === 'percentage' ? `${merchant.defaultFeeValue}%` : `$${merchant.defaultFeeValue.toFixed(2)}`} />
              </dl>
            </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                   <CardDescription>The last 5 transactions processed for this merchant.</CardDescription>
              </CardHeader>
              <CardContent>
                  <RecentTransactions transactions={recentTransactions} />
              </CardContent>
          </Card>
           <Card>
              <CardHeader>
                  <CardTitle>Recent Settlements</CardTitle>
                   <CardDescription>The last 5 internal settlements for this merchant.</CardDescription>
              </CardHeader>
              <CardContent>
                  <RecentSettlements settlements={recentSettlements} />
              </CardContent>
          </Card>

        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
              <CardDescription>Current operational status of the merchant.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailItem label="Overall Status" value={<StatusBadge status={merchant.status} />} />
              <DetailItem label="Onboarding" value={<StatusBadge status={merchant.onboardingStatus} />} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Associated Properties</CardTitle>
              <CardDescription>Linked properties or business units.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {merchant.propertyAssociations.length > 0 ? (
                  merchant.propertyAssociations.map(prop => <Badge key={prop} variant="secondary">{prop}</Badge>)
                ) : (
                  <p className="text-sm text-muted-foreground">No associated properties.</p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Internal notes and context.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{merchant.notes || "No notes for this merchant."}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

export const dynamic = 'force-dynamic';

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
import type { Merchant, Payment, Settlement } from "@/lib/types";
import Link from "next/link";
import { Pencil, Building, Info, AlertTriangle } from "lucide-react";
import { payoutChannelMap } from "@/lib/speedypay/payout-channels";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

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
                        <TableCell><StatusBadge status={s.status} /></TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(s.merchantNetAmount)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

function CapabilityWarnings({ merchant }: { merchant: Merchant }) {
    const warnings = [];

    if (merchant.merchantOfRecordType === 'client_merchant' && !merchant.isProviderOnboarded) {
        warnings.push({
            title: "Client is Merchant of Record, but Not Onboarded with Provider",
            description: "This merchant is configured as the Merchant of Record, but their account has not been fully onboarded or approved by the payment provider. All transactions will be processed under the platform's master account until provider onboarding is complete."
        });
    }

    if (merchant.settlementMode === 'provider_direct_settlement' && (merchant.providerMerchantMode !== 'direct_merchant' || !merchant.isProviderOnboarded)) {
        warnings.push({
            title: "Provider Direct Settlement is Not Available",
            description: "Direct settlement is selected, but the merchant is not configured or approved as a direct merchant with the provider. The system will fall back to 'Internal Payout' mode."
        });
    }
    
    if (warnings.length === 0) {
        return (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Configuration Status: OK</AlertTitle>
                <AlertDescription>
                    The merchant's configuration is fully supported and operational. The current effective settlement mode is <strong>{merchant.settlementMode.replace(/_/g, ' ')}</strong>.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-4">
            {warnings.map((warning, i) => (
                <Alert key={i} variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{warning.title}</AlertTitle>
                    <AlertDescription>{warning.description}</AlertDescription>
                </Alert>
            ))}
        </div>
    );
}


export default async function MerchantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const merchant = await getMerchantById(id);

  if (!merchant) {
    notFound();
  }

  const [recentTransactions, recentSettlements] = await Promise.all([
    getPaymentsByMerchantId(merchant.id, 5),
    getSettlementsByMerchantId(merchant.id, 5),
  ]);

  const payoutChannel = payoutChannelMap.get(merchant.defaultSettlementDestination?.bankCode || '');

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

        <div className="mb-6">
            <CapabilityWarnings merchant={merchant} />
        </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Core legal and contact details for this merchant.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                <DetailItem label="Parent Tenant" value={
                  <Link href={`/tenants/${merchant.tenant?.id}`} className="flex items-center gap-2 text-primary hover:underline">
                    <Building className="h-4 w-4"/>
                    {merchant.tenant?.name || 'Unknown'}
                  </Link>
                }/>
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
                <CardTitle>Provider & Settlement Configuration</CardTitle>
                <CardDescription>How this merchant is configured for payment processing and payouts.</CardDescription>
            </CardHeader>
            <CardContent>
                <dl className="divide-y">
                    <DetailItem label="Merchant of Record" value={<Badge variant="outline" className="capitalize">{merchant.merchantOfRecordType.replace(/_/g, ' ')}</Badge>} />
                    <DetailItem label="Provider Mode" value={<Badge variant="outline" className="capitalize">{merchant.providerMerchantMode.replace(/_/g, ' ')}</Badge>} />
                    <DetailItem label="Settlement Mode" value={<Badge variant="outline" className="capitalize">{merchant.settlementMode.replace(/_/g, ' ')}</Badge>} />
                    <DetailItem label="Settlement Schedule" value={<Badge variant="outline" className="capitalize">{merchant.settlementSchedule}</Badge>} />
                    <DetailItem label="Provider Merchant ID" value={<span className="font-mono text-xs">{merchant.providerMerchantId || 'N/A'}</span>} />
                    <DetailItem label="Provider Sub-Merchant ID" value={<span className="font-mono text-xs">{merchant.providerSubMerchantId || 'N/A'}</span>} />
                    <DetailItem label="Provider Onboarding" value={<StatusBadge status={merchant.providerOnboardingStatus} />} />
                </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Default Payout & Fee Configuration</CardTitle>
              <CardDescription>Default settings for how this merchant receives funds and how fees are applied.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                <DetailItem label="Default Payout Channel" value={<div className="flex flex-col"><Badge variant="secondary" className="w-fit">{payoutChannel?.description || merchant.defaultSettlementDestination?.bankCode}</Badge><span className="text-xs text-muted-foreground font-mono mt-1">{merchant.defaultSettlementDestination?.bankCode}</span></div>} />
                <DetailItem label="Recipient Account Name" value={merchant.defaultSettlementDestination?.accountName} />
                <DetailItem label="Recipient Account Number" value={merchant.defaultSettlementDestination?.accountNumberMasked} />
                <DetailItem label="Default Fee Type" value={<Badge variant="outline" className="capitalize">{merchant.defaultFeeType}</Badge>} />
                <DetailItem label="Default Fee Value" value={merchant.defaultFeeType === 'percentage' ? `${merchant.defaultFeeValue}%` : `PHP ${merchant.defaultFeeValue.toFixed(2)}`} />
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
              <CardTitle>Internal Status</CardTitle>
              <CardDescription>Current operational status of the merchant on this platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Activation Status</span>
                    <StatusBadge status={merchant.activationStatus} />
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Onboarding Status</span>
                    <StatusBadge status={merchant.onboardingStatus} />
                </div>
                 <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">KYC Status</span>
                    <StatusBadge status={merchant.kycStatus} />
                </div>
                 <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">Risk Status</span>
                    <StatusBadge status={merchant.riskStatus} />
                </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Associated Properties</CardTitle>
              <CardDescription>Linked properties or business units.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {merchant.entity.metadata.propertyAssociations && merchant.entity.metadata.propertyAssociations.length > 0 ? (
                  merchant.entity.metadata.propertyAssociations.map((prop: string) => <Badge key={prop} variant="secondary">{prop}</Badge>)
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

    
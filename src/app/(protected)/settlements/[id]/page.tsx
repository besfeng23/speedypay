import { getSettlementById, getMerchantById, getPaymentById } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="grid grid-cols-3 gap-2 py-3">
            <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
            <dd className="text-sm col-span-2 font-medium">{value}</dd>
        </div>
    )
}

export default async function SettlementDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const settlement = await getSettlementById(params.id);

  if (!settlement) {
    notFound();
  }
  
  const merchant = await getMerchantById(settlement.merchantId);
  const payment = await getPaymentById(settlement.paymentId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <>
      <PageHeader
        title="Settlement Details"
        description={`Settlement ID: ${settlement.id}`}
      />
      
      {settlement.failureReason && (
          <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Settlement Failure</AlertTitle>
              <AlertDescription>
                  {settlement.failureReason}
              </AlertDescription>
          </Alert>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Core Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <dl className="divide-y">
                        <DetailItem label="Payment ID" value={<Link href={`/transactions/${settlement.paymentId}`} className="text-primary hover:underline font-mono text-xs">{settlement.paymentId}</Link>} />
                        <DetailItem label="Merchant" value={<Link href={`/merchants/${settlement.merchantId}`} className="text-primary hover:underline">{merchant?.displayName || 'Unknown'}</Link>} />
                        <DetailItem label="Payout Reference" value={<Badge variant="secondary">{settlement.payoutReference}</Badge>} />
                        <DetailItem label="Created At" value={format(new Date(settlement.createdAt), "PPP p")} />
                    </dl>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Financials</CardTitle>
                </CardHeader>
                <CardContent>
                    <dl className="divide-y">
                        <DetailItem label="Gross Amount" value={formatCurrency(settlement.grossAmount)} />
                        <DetailItem label="Platform Fee" value={formatCurrency(settlement.platformFeeAmount)} />
                        <DetailItem label="Merchant Net Amount" value={formatCurrency(settlement.merchantNetAmount)} />
                    </dl>
                </CardContent>
            </Card>
        </div>
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Statuses</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <DetailItem label="Settlement Status" value={<StatusBadge status={settlement.settlementStatus} />} />
                    <DetailItem label="Remittance Status" value={<StatusBadge status={settlement.remittanceStatus} />} />
                </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}

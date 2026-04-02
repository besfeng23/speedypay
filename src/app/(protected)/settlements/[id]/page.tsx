import { getSettlementById, getMerchantById, getPaymentById, getAuditLogsByEntity } from "@/lib/data";
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
import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import { PayoutActions } from "./payout-actions";
import { Separator } from "@/components/ui/separator";

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 items-start gap-4 py-3">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-sm col-span-1 md:col-span-2 font-medium">{value}</dd>
        </div>
    )
}

function EventTimeline({ events }: { events: any[] }) {
    if (events.length === 0) {
        return <p className="text-sm text-muted-foreground">No events found for this settlement.</p>
    }
    return (
        <div className="space-y-4">
            {events.map((event, index) => (
                <div key={event.id} className="flex gap-4">
                    <div className="text-xs text-muted-foreground w-24 shrink-0">
                        {format(new Date(event.timestamp), 'MMM d, h:mm a')}
                    </div>
                    <div className="relative flex-1">
                        {index < events.length - 1 && <div className="absolute left-[5px] top-[1.2rem] h-full w-px bg-border" />}
                        <div className="relative flex items-center gap-2">
                           <div className="h-2.5 w-2.5 rounded-full bg-primary z-10" />
                           <p className="text-sm">{event.details}</p>
                        </div>
                    </div>
                </div>
            ))}
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
  const events = await getAuditLogsByEntity('settlement', settlement.id);

  const formatCurrency = (amount: number, currency: string = "PHP") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const hasPayoutError = settlement.remittanceStatus === 'failed' || (settlement.providerTransState && settlement.providerTransState !== '00');

  return (
    <>
      <PageHeader
        title="Settlement Details"
        description={`Track the journey of funds from internal settlement to merchant payout.`}
      >
        <div className="font-mono text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-md">{settlement.id}</div>
        <PayoutActions settlement={settlement} />
      </PageHeader>
      
      {hasPayoutError && (
          <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Payout Error</AlertTitle>
              <AlertDescription>
                  {settlement.failureReason || settlement.providerRespMessage || "An error occurred during the payout process."}
              </AlertDescription>
          </Alert>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Internal Settlement</CardTitle>
                    <CardDescription>The internal accounting record for this settlement.</CardDescription>
                </CardHeader>
                <CardContent>
                    <dl className="divide-y">
                        <DetailItem label="Internal Settlement ID" value={<span className="font-mono text-xs">{settlement.id}</span>} />
                        <DetailItem label="Source Payment ID" value={<Link href={`/transactions/${settlement.paymentId}`} className="text-primary hover:underline font-mono text-xs">{settlement.paymentId}</Link>} />
                        <DetailItem label="Merchant" value={<Link href={`/merchants/${settlement.merchantId}`} className="text-primary hover:underline">{merchant?.displayName || 'Unknown'}</Link>} />
                        <Separator className="my-2"/>
                        <DetailItem label="Gross Amount" value={formatCurrency(settlement.grossAmount)} />
                        <DetailItem label="Platform Fee" value={formatCurrency(settlement.platformFeeAmount)} />
                        <DetailItem label="Merchant Net Amount" value={<span className="font-bold">{formatCurrency(settlement.merchantNetAmount)}</span>} />
                         <Separator className="my-2"/>
                        <DetailItem label="Internal Settlement Status" value={<StatusBadge status={settlement.settlementStatus} />} />
                        <DetailItem label="Internal Remittance Status" value={<StatusBadge status={settlement.remittanceStatus} />} />
                    </dl>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Event History</CardTitle>
                    <CardDescription>The chronological log of events related to this settlement.</CardDescription>
                </CardHeader>
                <CardContent>
                    <EventTimeline events={events} />
                </CardContent>
            </Card>
        </div>
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Payout Provider Details</CardTitle>
                    <CardDescription>Data from the external payout provider (SpeedyPay).</CardDescription>
                </CardHeader>
                <CardContent>
                    {settlement.providerOrderSeq ? (
                         <dl className="divide-y">
                            <DetailItem label="Provider Name" value={settlement.providerName} />
                            <DetailItem label="Payout Channel" value={settlement.payoutChannelDescription || settlement.payoutChannelProcId} />
                            <DetailItem label="Provider Order Seq" value={<span className="font-mono text-xs">{settlement.providerOrderSeq}</span>} />
                            <DetailItem label="Provider Trans Seq" value={<span className="font-mono text-xs">{settlement.providerTransSeq || 'N/A'}</span>} />
                             <Separator className="my-2"/>
                            <DetailItem label="Provider State" value={<StatusBadge status={settlement.providerTransStateLabel} />} />
                            <DetailItem label="Provider Message" value={settlement.providerRespMessage} />
                            <DetailItem label="Provider Code" value={<Badge variant="secondary">{settlement.providerRespCode}</Badge>} />
                            <DetailItem label="Signature Verified" value={settlement.signatureVerified ? <CheckCircle className="text-green-500"/> : <AlertCircle className="text-red-500" />} />
                             <Separator className="my-2"/>
                            <DetailItem label="Provider Timestamp" value={settlement.providerTimestamp ? format(new Date(settlement.providerTimestamp), "PPpp") : 'N/A'} />
                            <DetailItem label="Last Queried" value={settlement.lastQueryAt ? format(new Date(settlement.lastQueryAt), "PPpp") : 'Never'} />
                         </dl>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Clock className="mx-auto h-8 w-8 mb-2" />
                            <p className="font-semibold">Payout Not Initiated</p>
                            <p className="text-sm">This settlement has not been sent to the provider yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}

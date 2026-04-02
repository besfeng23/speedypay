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
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { transactionStateMap } from "@/lib/speedypay/types";
import { PayoutActions } from "./payout-actions";
import { ScrollArea } from "@/components/ui/scroll-area";

function DetailItem({ label, value, isMono = false }: { label: string; value: React.ReactNode; isMono?: boolean }) {
    return (
        <div className="grid grid-cols-3 items-start gap-4 py-3">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className={`text-sm col-span-2 font-medium ${isMono ? 'font-mono text-xs' : ''}`}>{value || <span className="text-muted-foreground/70">N/A</span>}</dd>
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
  const events = await getAuditLogsByEntity(settlement.id);

  const formatCurrency = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };
  
  const providerStateLabel = settlement.providerTransState ? `${transactionStateMap[settlement.providerTransState]} (${settlement.providerTransState})` : null;

  return (
    <>
      <PageHeader
        title="Settlement Details"
        description={`Settlement ID: ${settlement.id}`}
      >
        <PayoutActions settlement={settlement} />
      </PageHeader>
      
      {settlement.failureReason && (
          <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Settlement or Remittance Failure</AlertTitle>
              <AlertDescription>
                  {settlement.failureReason}
              </AlertDescription>
          </Alert>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Payout Provider Details</CardTitle>
                    <CardDescription>Information from the payout provider (SpeedyPay).</CardDescription>
                </CardHeader>
                <CardContent>
                    <dl className="divide-y">
                        <DetailItem label="Provider Name" value={settlement.providerName} />
                        <DetailItem label="Provider Order ID" value={settlement.providerOrderSeq} isMono />
                        <DetailItem label="Provider Transaction ID" value={settlement.providerTransSeq} isMono />
                        <DetailItem label="Provider State" value={providerStateLabel} />
                        <DetailItem label="Provider Message" value={settlement.providerRespMessage} />
                        <DetailItem label="Payout Channel" value={settlement.payoutChannelDescription ? `${settlement.payoutChannelDescription} (${settlement.payoutChannelProcId})` : null} />
                        <DetailItem label="Last Provider Timestamp" value={settlement.providerTimestamp} isMono />
                        <DetailItem label="Signature Verified" value={settlement.signatureVerified === null ? <span className="text-muted-foreground/70">N/A</span> : (settlement.signatureVerified ? <CheckCircle className="h-5 w-5 text-green-500"/> : <XCircle className="h-5 w-5 text-red-500"/>)} />
                        <DetailItem label="Last Queried" value={settlement.lastQueryAt ? format(new Date(settlement.lastQueryAt), "PPP p") : 'Never'} />
                    </dl>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Financials</CardTitle>
                    <CardDescription>The breakdown of funds for this settlement instruction.</CardDescription>
                </CardHeader>
                <CardContent>
                    <dl className="divide-y">
                        <DetailItem label="Gross Amount" value={formatCurrency(settlement.grossAmount)} />
                        <DetailItem label="Platform Fee" value={formatCurrency(settlement.platformFeeAmount)} />
                        <DetailItem label="Merchant Net Amount" value={<strong className="text-lg">{formatCurrency(settlement.merchantNetAmount, 'PHP')}</strong>} />
                    </dl>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Core Information</CardTitle>
                    <CardDescription>Key identifiers and associations for this settlement.</CardDescription>
                </CardHeader>
                <CardContent>
                     <dl className="divide-y">
                        <DetailItem label="Source Payment ID" value={<Link href={`/transactions/${settlement.paymentId}`} className="text-primary hover:underline font-mono text-xs">{settlement.paymentId}</Link>} />
                        <DetailItem label="Merchant" value={<Link href={`/merchants/${settlement.merchantId}`} className="text-primary hover:underline">{merchant?.displayName || 'Unknown'}</Link>} />
                        <DetailItem label="Internal Payout Ref" value={settlement.payoutReference} isMono />
                        <DetailItem label="Created At" value={format(new Date(settlement.createdAt), "PPP p")} />
                        <DetailItem label="Last Updated" value={format(new Date(settlement.updatedAt), "PPP p")} />
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
                    <CardTitle>Statuses</CardTitle>
                    <CardDescription>Current state of the settlement and remittance process.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-y-4">
                    <DetailItem label="Internal Settlement" value={<StatusBadge status={settlement.settlementStatus} />} />
                    <DetailItem label="Internal Remittance" value={<StatusBadge status={settlement.remittanceStatus} />} />
                    <DetailItem label="Reconciliation" value={<StatusBadge status={settlement.reconciliationStatus} />} />
                </CardContent>
            </Card>
            <Card>
                 <CardHeader>
                    <CardTitle>Raw Provider Data</CardTitle>
                    <CardDescription>The raw JSON request and response for debugging.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="text-xs font-semibold mb-1">Request</h4>
                        <ScrollArea className="h-48 bg-muted/50 rounded p-2 border">
                            <pre className="text-xs font-mono">{settlement.rawProviderRequest ? JSON.stringify(JSON.parse(settlement.rawProviderRequest), null, 2) : 'N/A'}</pre>
                        </ScrollArea>
                    </div>
                     <div>
                        <h4 className="text-xs font-semibold mb-1">Response</h4>
                        <ScrollArea className="h-48 bg-muted/50 rounded p-2 border">
                            <pre className="text-xs font-mono">{settlement.rawProviderResponse ? JSON.stringify(JSON.parse(settlement.rawProviderResponse), null, 2) : 'N/A'}</pre>
                        </ScrollArea>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}

import { getPaymentById, getMerchantById, getSettlementByPaymentId, getAuditLogsByEntity } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { notFound } from "next/navigation";
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
import { ArrowRight, Wallet, Landmark, HandCoins, Minus, Equals, Link as LinkIcon, CheckCircle, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/stat-card";
import { Separator } from "@/components/ui/separator";
import { CollectionActions } from "./collection-actions";
import type { AuditLog } from "@/lib/types";

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 items-start gap-4 py-3">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-sm col-span-1 md:col-span-2 font-medium break-all">{value}</dd>
        </div>
    )
}

function EventTimeline({ events }: { events: AuditLog[] }) {
    if (events.length === 0) {
        return <p className="text-sm text-muted-foreground">No events found for this transaction.</p>
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
                           <p className="text-sm">
                             <span className="font-semibold capitalize text-muted-foreground">[{event.entityType}]</span> {event.details}
                           </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default async function TransactionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const payment = await getPaymentById(params.id);

  if (!payment) {
    notFound();
  }
  
  const merchant = await getMerchantById(payment.merchantId);
  const settlement = await getSettlementByPaymentId(payment.id);
  const events = await getAuditLogsByEntity('payment', payment.id);

  const formatCurrency = (amount: number, currency: string = "PHP") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  return (
    <>
      <PageHeader
        title="Transaction Details"
        description="A complete record of the payment from collection to internal settlement."
      >
        <div className="font-mono text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-md">{payment.id}</div>
        <CollectionActions payment={payment} />
      </PageHeader>
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Financial Breakdown</CardTitle>
                    <CardDescription>The flow of funds from gross payment to merchant net.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-4 items-center">
                    <StatCard title="Gross Payment" value={formatCurrency(payment.grossAmount)} icon={<Wallet />} className="shadow-none border-0" />
                    <div className="text-muted-foreground flex justify-center"><Minus /></div>
                    <StatCard title="Platform Fee" value={formatCurrency(payment.platformFeeAmount)} icon={<HandCoins />} className="shadow-none border-0" />
                    <div className="col-span-full"><Separator /></div>
                    <div className="text-muted-foreground flex justify-center md:col-start-2"><Equals /></div>
                    <StatCard title="Net Amount to Settle" value={formatCurrency(payment.merchantNetAmount)} icon={<Landmark />} className="shadow-none border-0 md:col-start-3" />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Core Details</CardTitle>
                    <CardDescription>Internal record of the payment transaction.</CardDescription>
                </CardHeader>
                <CardContent>
                    <dl className="divide-y">
                        <DetailItem label="Customer" value={payment.customerName} />
                        <DetailItem label="Customer Email" value={payment.customerEmail} />
                        <DetailItem label="Merchant" value={<Link href={`/merchants/${payment.merchantId}`} className="text-primary hover:underline">{merchant?.displayName || 'Unknown'}</Link>} />
                        <DetailItem label="Description" value={payment.bookingReferenceOrInvoiceReference} />
                        <DetailItem label="Source Channel" value={<Badge variant="outline">{payment.sourceChannel}</Badge>} />
                        <DetailItem label="Created At" value={format(new Date(payment.createdAt), "PPP p")} />
                         {settlement && <DetailItem label="Resulting Settlement" value={<Link href={`/settlements/${settlement.id}`} className="text-primary hover:underline font-mono text-xs">{settlement.id}</Link>} />}
                    </dl>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Collection Details (Provider)</CardTitle>
                    <CardDescription>Data from the external payment collection provider.</CardDescription>
                </CardHeader>
                <CardContent>
                    {payment.providerPaymentUrl || payment.providerCollectionRespCode ? (
                         <dl className="divide-y">
                            {payment.providerPaymentUrl && <DetailItem label="Payment URL" value={<a href={payment.providerPaymentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-2"><LinkIcon className="h-4 w-4" /> Link</a>} />}
                            <DetailItem label="Provider Trans Seq" value={<span className="font-mono text-xs">{payment.providerTransSeq || 'N/A'}</span>} />
                            <Separator className="my-2" />
                            <DetailItem label="Provider State" value={<StatusBadge status={payment.providerStateLabel || payment.providerTransState} />} />
                            <DetailItem label="Provider Resp Code" value={<Badge variant="secondary">{payment.providerCollectionRespCode}</Badge>} />
                            <DetailItem label="Provider Resp Message" value={payment.providerCollectionRespMessage} />
                            <DetailItem label="Signature Verified" value={payment.providerCollectionSignatureVerified ? <CheckCircle className="text-green-500"/> : <AlertCircle className="text-red-500" />} />
                             <Separator className="my-2"/>
                            <DetailItem label="Provider Create Time" value={payment.providerCreateTime ? format(new Date(payment.providerCreateTime), "PPpp") : 'N/A'} />
                            <DetailItem label="Provider Notify Time" value={payment.providerNotifyTime ? format(new Date(payment.providerNotifyTime), "PPpp") : 'N/A'} />
                            <DetailItem label="Last Queried" value={payment.lastQueryAt ? format(new Date(payment.lastQueryAt), "PPpp") : 'Never'} />
                         </dl>
                    ) : (
                         <div className="text-center py-8 text-muted-foreground">
                             <Clock className="mx-auto h-8 w-8 mb-2" />
                            <p className="font-semibold">No Provider Data</p>
                            <p className="text-sm">No collection data available for this payment yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Event History</CardTitle>
                    <CardDescription>The chronological log of events related to this payment and any resulting settlement.</CardDescription>
                </CardHeader>
                <CardContent>
                    <EventTimeline events={events} />
                </CardContent>
            </Card>

        </div>
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Status Timeline</CardTitle>
                    <CardDescription>The progression of the transaction through the system.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="flex-1"><StatusBadge status={payment.paymentStatus} /></div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1"><StatusBadge status={payment.settlementStatus} /></div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1"><StatusBadge status={payment.remittanceStatus} /></div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex-1 text-center">Payment</div>
                        <div className="w-4"></div>
                        <div className="flex-1 text-center">Settlement</div>
                        <div className="w-4"></div>
                        <div className="flex-1 text-center">Remittance</div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}

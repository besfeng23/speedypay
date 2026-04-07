export const dynamic = 'force-dynamic';

import { getPaymentById, getMerchantById, getSettlementByPaymentId, getAuditLogsByEntity, getPaymentAllocations, findEntityById } from "@/lib/data";
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
import { Wallet, HandCoins, Building, User, Link as LinkIcon, CheckCircle, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { CollectionActions } from "./collection-actions";
import type { AuditLog, PaymentAllocation } from "@/lib/types";

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

async function AllocationBreakdown({ allocations, grossAmount }: { allocations: PaymentAllocation[], grossAmount: number }) {
    const entityIds = [...new Set(allocations.map(a => a.recipientEntityId))];
    const entities = await Promise.all(entityIds.map(id => findEntityById(id)));
    const entityMap = new Map(entities.filter(Boolean).map(e => [e!.id, e]));

    const formatCurrency = (amount: number, currency: string = "PHP") => {
        return new Intl.NumberFormat("en-US", { style: "currency", currency: currency }).format(amount);
    };
    
    const allocationIcons: Record<string, React.ReactNode> = {
        'speedypay': <HandCoins className="text-muted-foreground"/>,
        'platform': <Wallet className="text-muted-foreground"/>,
        'tenant': <Building className="text-muted-foreground"/>,
        'merchant': <User className="text-muted-foreground"/>,
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Financial Breakdown</CardTitle>
                <CardDescription>The flow of funds from gross payment to all recipients.</CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-4">
                    {allocations.map(alloc => {
                        const entity = entityMap.get(alloc.recipientEntityId);
                        const icon = entity ? allocationIcons[entity.entityType] : <Wallet />;
                        return (
                             <li key={alloc.id} className="flex items-center gap-4">
                                <div className="p-3 bg-muted rounded-full">
                                    {icon}
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium capitalize">{alloc.allocationType.replace(/_/g, ' ')}</div>
                                    <div className="text-xs text-muted-foreground">{entity?.displayName || 'Unknown Entity'}</div>
                                </div>
                                <div className="text-right font-mono text-sm">
                                    {formatCurrency(alloc.amount, alloc.currency)}
                                </div>
                            </li>
                        )
                    })}
                </ul>
                <Separator className="my-4"/>
                <div className="flex justify-between items-center font-bold">
                    <span>Gross Payment Total</span>
                    <span>{formatCurrency(grossAmount, allocations[0]?.currency)}</span>
                </div>
            </CardContent>
        </Card>
    )
}


export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payment = await getPaymentById(id);

  if (!payment) {
    notFound();
  }
  
  const [merchant, settlement, events, allocations] = await Promise.all([
      getMerchantById(payment.merchantId),
      getSettlementByPaymentId(payment.id),
      getAuditLogsByEntity('payment', payment.id),
      getPaymentAllocations(payment.id),
  ]);

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
            <AllocationBreakdown allocations={allocations} grossAmount={payment.grossAmount} />

            <Card>
                <CardHeader>
                    <CardTitle>Core Details</CardTitle>
                    <CardDescription>Internal record of the payment transaction.</CardDescription>
                </CardHeader>
                <CardContent>
                    <dl className="divide-y">
                        <DetailItem label="Payment Status" value={<StatusBadge status={payment.paymentStatus} />} />
                        <DetailItem label="Settlement Status" value={<StatusBadge status={payment.settlementStatus} />} />
                        <DetailItem label="Customer" value={payment.customerName} />
                        <DetailItem label="Customer Email" value={payment.customerEmail} />
                        <DetailItem label="Merchant" value={<Link href={`/merchants/${payment.merchantId}`} className="text-primary hover:underline">{merchant?.entity.displayName || 'Unknown'}</Link>} />
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
                    <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <StatusBadge status={payment.paymentStatus} />
                </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}

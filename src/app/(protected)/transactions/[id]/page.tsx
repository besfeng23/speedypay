import { getPaymentById, getMerchantById } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="grid grid-cols-3 gap-2 py-3">
            <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
            <dd className="text-sm col-span-2 font-medium">{value}</dd>
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <>
      <PageHeader
        title="Transaction Details"
        description={`Payment ID: ${payment.id}`}
      />
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Payment Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <dl className="divide-y">
                        <DetailItem label="Customer" value={payment.customerName} />
                        <DetailItem label="Customer Email" value={payment.customerEmail} />
                        <DetailItem label="Merchant" value={<Link href={`/merchants/${payment.merchantId}`} className="text-primary hover:underline">{merchant?.displayName || 'Unknown'}</Link>} />
                        <DetailItem label="External Reference" value={<Badge variant="secondary">{payment.externalReference}</Badge>} />
                        <DetailItem label="Invoice Reference" value={<Badge variant="secondary">{payment.bookingReferenceOrInvoiceReference}</Badge>} />
                        <DetailItem label="Source Channel" value={<Badge variant="outline">{payment.sourceChannel}</Badge>} />
                        <DetailItem label="Created At" value={format(new Date(payment.createdAt), "PPP p")} />
                    </dl>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Financial Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <dl className="divide-y">
                        <DetailItem label="Gross Amount" value={formatCurrency(payment.grossAmount)} />
                        <DetailItem label="Platform Fee" value={formatCurrency(payment.platformFeeAmount)} />
                        <DetailItem label="Merchant Net Amount" value={formatCurrency(payment.merchantNetAmount)} />
                    </dl>
                </CardContent>
            </Card>
        </div>
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Status Timeline</CardTitle>
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

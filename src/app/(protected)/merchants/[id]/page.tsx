import { getMerchantById } from "@/lib/data";
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

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="grid grid-cols-3 gap-2 py-2">
            <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
            <dd className="text-sm col-span-2">{value}</dd>
        </div>
    )
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

  return (
    <>
      <PageHeader
        title={merchant.displayName}
        description={`Details for merchant ID: ${merchant.id}`}
      >
        <Button>Edit Merchant</Button>
      </PageHeader>
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Business Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <dl className="divide-y">
                        <DetailItem label="Business Name" value={merchant.businessName} />
                        <DetailItem label="Display Name" value={merchant.displayName} />
                        <DetailItem label="Contact Name" value={merchant.contactName} />
                        <DetailItem label="Contact Email" value={merchant.email} />
                        <DetailItem label="Mobile" value={merchant.mobile} />
                        <DetailItem label="Created At" value={format(new Date(merchant.createdAt), "PPP p")} />
                        <DetailItem label="Last Updated" value={format(new Date(merchant.updatedAt), "PPP p")} />
                    </dl>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Settlement & Fees</CardTitle>
                </CardHeader>
                <CardContent>
                    <dl className="divide-y">
                        <DetailItem label="Settlement Channel" value={merchant.settlementChannel} />
                        <DetailItem label="Account Name" value={merchant.settlementAccountName} />
                        <DetailItem label="Account/Wallet ID" value={merchant.settlementAccountNumberOrWalletId} />
                        <DetailItem label="Default Fee Type" value={<Badge variant="outline" className="capitalize">{merchant.defaultFeeType}</Badge>} />
                        <DetailItem label="Default Fee Value" value={merchant.defaultFeeType === 'percentage' ? `${merchant.defaultFeeValue}%` : `$${merchant.defaultFeeValue.toFixed(2)}`} />
                    </dl>
                </CardContent>
            </Card>

        </div>
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <DetailItem label="Overall Status" value={<StatusBadge status={merchant.status} />} />
                    <DetailItem label="Onboarding" value={<StatusBadge status={merchant.onboardingStatus} />} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Associated Properties</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {merchant.propertyAssociations.length > 0 ? (
                            merchant.propertyAssociations.map(prop => <Badge key={prop}>{prop}</Badge>)
                        ) : (
                            <p className="text-sm text-muted-foreground">No associated properties.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Notes</CardTitle>
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

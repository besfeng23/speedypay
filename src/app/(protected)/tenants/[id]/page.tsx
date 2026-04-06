export const dynamic = 'force-dynamic';

import { getTenantById, getMerchantsByTenantId } from "@/lib/data";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Merchant } from "@/lib/types";
import Link from "next/link";
import { Pencil, PlusCircle, Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 items-start gap-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm col-span-2 font-medium">{value}</dd>
    </div>
  );
}

function TenantMerchantsTable({ merchants }: { merchants: Merchant[] }) {
    if (merchants.length === 0) {
        return <p className="text-sm text-muted-foreground py-4">No merchants found for this tenant.</p>;
    }
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Business Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Onboarding</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {merchants.map((merchant) => (
                    <TableRow key={merchant.id}>
                        <TableCell>
                            <Link href={`/merchants/${merchant.id}`} className="font-medium hover:underline">{merchant.displayName}</Link>
                            <div className="text-xs text-muted-foreground">{merchant.contactName}</div>
                        </TableCell>
                        <TableCell><StatusBadge status={merchant.status} /></TableCell>
                        <TableCell><StatusBadge status={merchant.onboardingStatus} /></TableCell>
                        <TableCell className="text-right">
                             <Link href={`/merchants/${merchant.id}`}>
                                <Button variant="outline" size="sm">View</Button>
                            </Link>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}


export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await getTenantById(id);

  if (!tenant) {
    notFound();
  }

  const merchants = await getMerchantsByTenantId(tenant.id);
  

  return (
    <>
      <PageHeader
        title={tenant.name}
        description={`Details for tenant ID: ${tenant.id}`}
      >
        <Button variant="outline" asChild>
            <Link href={`/merchants/new?tenantId=${tenant.id}`}>
                <PlusCircle />
                Add Merchant
            </Link>
        </Button>
      </PageHeader>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 grid gap-6">
          <Card>
              <CardHeader>
                  <CardTitle>Merchants</CardTitle>
                   <CardDescription>All merchants associated with this tenant.</CardDescription>
              </CardHeader>
              <CardContent>
                  <TenantMerchantsTable merchants={merchants} />
              </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                <DetailItem label="Status" value={<StatusBadge status={tenant.status} />} />
                <DetailItem label="Platform Fee" value={`${tenant.platformFeeValue}${tenant.platformFeeType === 'percentage' ? '%' : ' PHP (fixed)'}`} />
                <DetailItem label="Created At" value={format(new Date(tenant.createdAt), "PPP p")} />
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{tenant.notes || "No notes for this tenant."}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

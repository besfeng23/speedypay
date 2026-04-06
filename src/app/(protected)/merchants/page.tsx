export const dynamic = 'force-dynamic';

import Link from "next/link";
import { PlusCircle, Users } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { getMerchants, getTenants } from "@/lib/data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import type { Merchant } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";

export default async function MerchantsPage() {
  const [merchants, tenants] = await Promise.all([getMerchants(), getTenants()]);
  const tenantMap = new Map(tenants.map(t => [t.id, t.name]));

  return (
    <>
      <PageHeader
        title="All Merchants"
        description="A complete list of all merchants across all tenants."
      >
        <Link href="/merchants/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Merchant
          </Button>
        </Link>
      </PageHeader>
      <Card>
        <CardContent className="p-0">
            {merchants.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Business Name</TableHead>
                            <TableHead className="hidden lg:table-cell">Tenant</TableHead>
                            <TableHead className="hidden sm:table-cell">Status</TableHead>
                            <TableHead className="hidden md:table-cell">Onboarding</TableHead>
                            <TableHead className="hidden lg:table-cell">Contact</TableHead>
                            <TableHead className="hidden sm:table-cell">Created At</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {merchants.map((merchant) => (
                            <TableRow key={merchant.id}>
                                <TableCell className="font-medium">
                                    <Link href={`/merchants/${merchant.id}`} className="hover:underline">
                                        {merchant.displayName}
                                    </Link>
                                    <div className="text-sm text-muted-foreground lg:hidden">{tenantMap.get(merchant.tenantId) || 'Unknown Tenant'}</div>
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">
                                    <Link href={`/tenants/${merchant.tenantId}`} className="hover:underline">
                                        {tenantMap.get(merchant.tenantId) || 'Unknown'}
                                    </Link>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell"><StatusBadge status={merchant.status} /></TableCell>
                                <TableCell className="hidden md:table-cell"><StatusBadge status={merchant.onboardingStatus} /></TableCell>
                                <TableCell className="hidden lg:table-cell">
                                    <div className="font-medium">{merchant.contactName}</div>
                                    <div className="text-sm text-muted-foreground">{merchant.email}</div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">{format(new Date(merchant.createdAt), 'MMM d, yyyy')}</TableCell>
                                <TableCell className="text-right">
                                    <Link href={`/merchants/${merchant.id}`}>
                                        <Button variant="outline" size="sm">View</Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <EmptyState
                    icon={<Users />}
                    title="No Merchants Found"
                    description="You haven't added any merchants yet."
                >
                    <Link href="/merchants/new">
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Your First Merchant
                        </Button>
                    </Link>
                </EmptyState>
            )}
        </CardContent>
      </Card>
    </>
  );
}

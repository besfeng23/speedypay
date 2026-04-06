export const dynamic = 'force-dynamic';

import Link from "next/link";
import { PlusCircle, Building } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { getTenants } from "@/lib/data";
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
import type { Tenant } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";

export default async function TenantsPage() {
  const tenants: Tenant[] = await getTenants();

  return (
    <>
      <PageHeader
        title="Tenants"
        description="Manage your platform's client tenants."
      >
        <Link href="/tenants/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Tenant
          </Button>
        </Link>
      </PageHeader>
      <Card>
        <CardContent className="p-0">
            {tenants.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tenant Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Platform Fee</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tenants.map((tenant) => (
                            <TableRow key={tenant.id}>
                                <TableCell className="font-medium">
                                    <Link href={`/tenants/${tenant.id}`} className="hover:underline">
                                        {tenant.name}
                                    </Link>
                                    <div className="text-sm text-muted-foreground font-mono">{tenant.id}</div>
                                </TableCell>
                                <TableCell><StatusBadge status={tenant.status} /></TableCell>
                                <TableCell>
                                    {tenant.platformFeeType === 'percentage' 
                                        ? `${tenant.platformFeeValue}%` 
                                        : `PHP ${tenant.platformFeeValue.toFixed(2)}`}
                                </TableCell>
                                <TableCell>{format(new Date(tenant.createdAt), 'MMM d, yyyy')}</TableCell>
                                <TableCell className="text-right">
                                    <Link href={`/tenants/${tenant.id}`}>
                                        <Button variant="outline" size="sm">View</Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <EmptyState
                    icon={<Building />}
                    title="No Tenants Found"
                    description="You haven't added any tenants yet."
                >
                    <Link href="/tenants/new">
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Your First Tenant
                        </Button>
                    </Link>
                </EmptyState>
            )}
        </CardContent>
      </Card>
    </>
  );
}

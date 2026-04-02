"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { queryCollectionStatus } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import type { Payment } from "@/lib/types";
import { Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export function CollectionActions({ payment }: { payment: Payment }) {
    const [isQuerying, startQuerying] = useTransition();
    const { toast } = useToast();
    const router = useRouter();

    const canQuery = payment.paymentStatus === 'pending' || payment.paymentStatus === 'processing';

    const handleQuery = () => {
        startQuerying(async () => {
            const result = await queryCollectionStatus(payment.id);
            if (result.success) {
                toast({ title: "Status Queried", description: "Latest status has been pulled from the provider." });
                router.refresh();
            } else {
                toast({ variant: "destructive", title: "Query Failed", description: result.message });
            }
        });
    };

    return (
        <div className="flex items-center gap-2">
            {canQuery && (
                <Button variant="outline" onClick={handleQuery} disabled={isQuerying}>
                    {isQuerying ? <Loader2 className="animate-spin"/> : <RefreshCw />}
                    <span className="ml-2">{isQuerying ? 'Querying...' : 'Query Collection Status'}</span>
                </Button>
            )}
        </div>
    );
}

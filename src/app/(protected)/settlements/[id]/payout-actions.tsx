// This needs to be a client component for the actions
"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { initiateRemittance, querySettlementStatus } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import type { Settlement } from "@/lib/types";
import { HandCoins, Loader2, RefreshCw } from "lucide-react";

export function PayoutActions({ settlement }: { settlement: Settlement }) {
    const [isInitiating, startInitiating] = useTransition();
    const [isQuerying, startQuerying] = useTransition();
    const { toast } = useToast();

    const canInitiate = settlement.settlementStatus === 'pending' && !settlement.providerOrderSeq;
    const canQuery = !!settlement.providerOrderSeq;

    const handleInitiate = () => {
        startInitiating(async () => {
            const result = await initiateRemittance(settlement.id);
            if (result.success) {
                toast({ title: "Payout Initiated", description: result.message });
            } else {
                toast({ variant: "destructive", title: "Initiation Failed", description: result.message });
            }
        });
    };
    
    const handleQuery = () => {
        startQuerying(async () => {
            const result = await querySettlementStatus(settlement.id);
            if (result.success) {
                toast({ title: "Status Queried", description: result.message });
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
                    {isQuerying ? 'Querying...' : 'Query Status'}
                </Button>
            )}
             {canInitiate && (
                <Button onClick={handleInitiate} disabled={isInitiating}>
                    {isInitiating ? <Loader2 className="animate-spin"/> : <HandCoins />}
                    {isInitiating ? 'Initiating...' : 'Initiate Payout'}
                </Button>
            )}
        </div>
    );
}

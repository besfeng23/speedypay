// This needs to be a client component for the actions
"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { initiateRemittance, querySettlementStatus } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import type { Settlement } from "@/lib/types";
import { HandCoins, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function PayoutActions({ settlement }: { settlement: Settlement }) {
    const [isInitiating, startInitiating] = useTransition();
    const [isQuerying, startQuerying] = useTransition();
    const { toast } = useToast();
    const router = useRouter();

    const canInitiate = settlement.status === 'unpaid';
    const canQuery = !!settlement.payoutId;
    const isLiveEnv = process.env.NEXT_PUBLIC_SPEEDYPAY_ENV === 'production';

    const handleInitiate = () => {
        startInitiating(async () => {
            const result = await initiateRemittance(settlement.id);
            if (result.success) {
                toast({ title: "Payout Initiated", description: "Payout request has been sent to the provider." });
                router.refresh();
            } else {
                toast({ variant: "destructive", title: "Initiation Failed", description: result.message });
            }
        });
    };
    
    const handleQuery = () => {
        startQuerying(async () => {
            const result = await querySettlementStatus(settlement.id);
            if (result.success) {
                toast({ title: "Status Queried", description: "Latest status has been pulled from the provider." });
                router.refresh();
            } else {
                toast({ variant: "destructive", title: "Query Failed", description: result.message });
            }
        });
    };

    const InitiateButton = (
        <Button onClick={isLiveEnv ? undefined : handleInitiate} disabled={isInitiating}>
            {isInitiating ? <Loader2 className="animate-spin"/> : <HandCoins />}
            {isInitiating ? 'Initiating...' : 'Initiate Payout'}
        </Button>
    );

    return (
        <div className="flex items-center gap-2">
            {canQuery && (
                <Button variant="outline" onClick={handleQuery} disabled={isQuerying}>
                    {isQuerying ? <Loader2 className="animate-spin"/> : <RefreshCw />}
                    {isQuerying ? 'Querying...' : 'Query Status'}
                </Button>
            )}
             {canInitiate && (
                isLiveEnv ? (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            {InitiateButton}
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="text-red-500" />
                                    Confirm Live Payout
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    You are in a LIVE environment. This action will initiate a real money transfer of
                                    <strong className="mx-1">{settlement.merchantNetAmount.toFixed(2)} PHP</strong>
                                    to the merchant. This cannot be undone. Are you sure you want to proceed?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleInitiate} className="bg-destructive hover:bg-destructive/90">
                                    Yes, Initiate Payout
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                ) : (
                    InitiateButton
                )
            )}
        </div>
    );
}

"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { speedypayConfig } from "@/lib/speedypay/config";
import { useAuth } from "@/lib/firebase/hooks";

interface CheckItemProps {
    isReady: boolean;
    title: string;
    description: string;
    fixSuggestion?: string;
}

function CheckItem({ isReady, title, description, fixSuggestion }: CheckItemProps) {
    return (
        <div className="flex items-start gap-4 p-4 rounded-md border bg-background">
            <div className="mt-0.5 shrink-0">
                 {isReady ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                )}
            </div>
            <div className="flex-1">
                <h4 className="font-semibold">{title}</h4>
                <p className="text-sm text-muted-foreground">{description}</p>
                 {!isReady && fixSuggestion && <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">{fixSuggestion}</p>}
            </div>
        </div>
    )
}


export function SystemReadiness() {
    const { user } = useAuth();
    const isAuthMocked = user?.uid === 'mock-user-id';
    
    // Environment variables checks
    const isMerchSeqSet = !!speedypayConfig.merchSeq;
    const isSecretKeySet = !!speedypayConfig.secretKey;
    const isNotifyUrlSet = !!speedypayConfig.notifyUrl;
    const areAllCredsSet = isMerchSeqSet && isSecretKeySet;

    // We warn if the app is in production env but still using the mock store for idempotency.
    const isProdIdempotencyReady = speedypayConfig.env !== 'production';

    return (
        <Card>
            <CardHeader>
                <CardTitle>Deployment Checklist</CardTitle>
                <CardDescription>
                A checklist for production readiness and system configuration status.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <CheckItem 
                    isReady={!isAuthMocked}
                    title="Authentication"
                    description={isAuthMocked ? "Auth is in Demo Mode with a mock user." : "Real Firebase Authentication is active."}
                    fixSuggestion="For production, replace the mock provider in `src/lib/firebase/auth-provider.tsx` with a real Firebase Auth implementation."
                />
                 <CheckItem 
                    isReady={false} // Always false as this is a mock DB
                    title="Database"
                    description="The application is using a mock, in-memory data store. This is NOT production-ready."
                    fixSuggestion="For production, migrate the data layer in `src/lib/data.ts` to a persistent database like Firestore."
                />
                 <CheckItem 
                    isReady={areAllCredsSet}
                    title="Provider Credentials"
                    description={areAllCredsSet ? "All required SpeedyPay API credentials are configured." : "One or more critical SpeedyPay API credentials are missing."}
                    fixSuggestion={`Ensure SPEEDYPAY_MERCH_SEQ and SPEEDYPAY_SECRET_KEY are set in your environment.`}
                />
                 <CheckItem 
                    isReady={isNotifyUrlSet}
                    title="Webhook Callback Endpoint"
                    description={isNotifyUrlSet ? `The callback handler is configured to be at ${speedypayConfig.notifyUrl}` : "The public callback notification URL is not configured."}
                    fixSuggestion="Set the `SPEEDYPAY_NOTIFY_URL` environment variable to the public URL of your deployed webhook endpoint."
                />
                <CheckItem 
                    isReady={isProdIdempotencyReady}
                    title="Webhook Idempotency"
                    description={!isProdIdempotencyReady ? "Handler is using an in-memory idempotency store in a production environment." : "Handler is using a non-production in-memory store. This is suitable for testing only."}
                    fixSuggestion="CRITICAL: For production, replace the in-memory Set in `/src/api/webhooks/speedypay/route.ts` with a persistent store like Redis or a database table."
                />
                 <CheckItem 
                    isReady={true}
                    title="Server-Side Logic"
                    description="Core logic for payments, settlements, and callbacks is handled in server-side actions and API routes."
                />
            </CardContent>
        </Card>
    )
}

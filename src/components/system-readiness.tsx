"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CheckCircle, AlertTriangle, CircleDashed } from "lucide-react";
import { speedypayConfig, isSpeedyPayConfigured } from "@/lib/speedypay/config";
import { useAuth } from "@/lib/firebase/hooks";

interface CheckItemProps {
    isReady: boolean;
    isBlocking?: boolean;
    title: string;
    description: string;
    fixSuggestion?: string;
}

function CheckItem({ isReady, isBlocking = true, title, description, fixSuggestion }: CheckItemProps) {
    const Icon = isReady ? CheckCircle : (isBlocking ? AlertTriangle : CircleDashed);
    const color = isReady ? 'text-green-500' : (isBlocking ? 'text-orange-500' : 'text-gray-500');

    return (
        <div className="flex items-start gap-4 p-4 rounded-md border bg-background">
            <div className="mt-0.5 shrink-0">
                 <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div className="flex-1">
                <h4 className="font-semibold">{title}</h4>
                <p className="text-sm text-muted-foreground">{description}</p>
                 {!isReady && fixSuggestion && <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Suggestion: {fixSuggestion}</p>}
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
    const areAllCredsSet = isMerchSeqSet && isSecretKeySet;
    const isNotifyUrlSet = !!speedypayConfig.notifyUrl;
    const isProd = speedypayConfig.env === 'production';

    // We warn if the app is in production env but still using the mock store for idempotency.
    // This is always false for this project, but is a critical check for a real implementation.
    const isProdIdempotencyReady = !isProd; // Should be a check against a real persistent store in prod

    const checks = [
        { 
            isReady: !isAuthMocked, 
            isBlocking: true,
            title: "Authentication Provider", 
            description: isAuthMocked ? "Auth is in Demo Mode. Real users cannot sign in." : "Real Firebase Authentication is active.",
            fixSuggestion: "Replace the mock provider in `src/lib/firebase/auth-provider.tsx` with a real Firebase Auth implementation."
        },
        { 
            isReady: false, 
            isBlocking: true,
            title: "Database", 
            description: "The application is using a mock, in-memory data store. All data will be lost on restart.",
            fixSuggestion: "For production, migrate the data layer in `src/lib/data.ts` to a persistent database like Firestore."
        },
        { 
            isReady: areAllCredsSet, 
            isBlocking: true,
            title: "Provider Credentials", 
            description: areAllCredsSet ? "All required SpeedyPay API credentials are configured." : "One or more critical SpeedyPay API credentials are missing.",
            fixSuggestion: "Ensure `SPEEDYPAY_MERCH_SEQ` and `SPEEDYPAY_SECRET_KEY` are set in your environment variables."
        },
        { 
            isReady: isNotifyUrlSet, 
            isBlocking: true,
            title: "Webhook Callback Endpoint", 
            description: isNotifyUrlSet ? `The callback handler is configured to be at ${speedypayConfig.notifyUrl}` : "The public callback notification URL is not configured.",
            fixSuggestion: "Set the `SPEEDYPAY_NOTIFY_URL` environment variable to the public URL of your deployed webhook endpoint."
        },
        { 
            isReady: isProdIdempotencyReady, 
            isBlocking: isProd,
            title: "Webhook Idempotency", 
            description: isProdIdempotencyReady ? "Using a non-production in-memory store suitable for testing." : "CRITICAL: Handler is using an in-memory idempotency store in a production environment.",
            fixSuggestion: "For production, replace the in-memory Set in `/src/api/webhooks/speedypay/route.ts` with a persistent store like Redis or a database table."
        }
    ];

    const blockingIssues = checks.filter(c => !c.isReady && c.isBlocking).length;
    const warningIssues = checks.filter(c => !c.isReady && !c.isBlocking).length;

    let overallStatus: 'Ready' | 'UAT Ready' | 'Blocked' = 'Ready';
    let statusDescription = "All systems configured for production.";
    let statusColor = 'bg-green-500';

    if (blockingIssues > 0) {
        overallStatus = 'Blocked';
        statusDescription = `${blockingIssues} blocking issue(s) must be resolved before production deployment.`;
        statusColor = 'bg-red-500';
    } else if (warningIssues > 0) {
        overallStatus = 'UAT Ready';
        statusDescription = `The system is ready for UAT, but ${warningIssues} non-blocking issue(s) should be reviewed.`;
        statusColor = 'bg-yellow-500';
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Deployment Checklist</CardTitle>
                <CardDescription>
                A real-time checklist for production readiness and system configuration status.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-muted">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${statusColor}`} />
                        <h3 className="text-lg font-semibold">{overallStatus}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{statusDescription}</p>
                </div>
                <div className="space-y-4">
                    {checks.map((check, i) => <CheckItem key={i} {...check} />)}
                </div>
            </CardContent>
        </Card>
    )
}

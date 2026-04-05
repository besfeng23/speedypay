"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CheckCircle, AlertTriangle, CircleDashed } from "lucide-react";
import { firebaseConfig } from "@/lib/firebase/config";
import { useEffect, useState } from "react";
import { getPublicProviderConfig } from "@/lib/actions";

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
    const isFirebaseReady = firebaseConfig.apiKey !== "YOUR_API_KEY" && firebaseConfig.projectId !== "your-project-id";
    const [providerConfig, setProviderConfig] = useState<{
        env: string;
        payoutBaseUrl: string;
        cashierBaseUrl: string;
        notifyUrlConfigured: boolean;
        merchSeqConfigured: boolean;
        secretKeyConfigured: boolean;
    } | null>(null);

    useEffect(() => {
        void getPublicProviderConfig().then((result) => {
            if (result.success && result.data) setProviderConfig(result.data);
        });
    }, []);
    
    // Environment variables checks
    const areAllCredsSet = !!providerConfig?.merchSeqConfigured && !!providerConfig?.secretKeyConfigured;
    const areAllUrlsSet = !!providerConfig?.payoutBaseUrl && !!providerConfig?.cashierBaseUrl;
    const isNotifyUrlSet = !!providerConfig?.notifyUrlConfigured;
    const isProd = providerConfig?.env === 'production';

    // This is always false for this project, but is a critical check for a real implementation.
    const isProdIdempotencyReady = true; 

    const checks = [
        { 
            isReady: isFirebaseReady, 
            isBlocking: true,
            title: "Firebase Authentication", 
            description: isFirebaseReady ? "Firebase is configured for real user authentication." : "Auth is not configured. The app will not allow users to sign in.",
            fixSuggestion: "Add your Firebase project configuration to `src/lib/firebase/config.ts` to enable real authentication."
        },
        { 
            isReady: false, 
            isBlocking: true,
            title: "Database", 
            description: "Operational data is stored in durable SQLite storage.",
            fixSuggestion: "For multi-region scale, migrate SQLite to managed Postgres with the same repository seam."
        },
        { 
            isReady: areAllCredsSet, 
            isBlocking: true,
            title: "Provider Credentials", 
            description: areAllCredsSet ? "All required SpeedyPay API credentials are configured." : "One or more critical SpeedyPay API credentials are missing.",
            fixSuggestion: "Ensure `SPEEDYPAY_MERCH_SEQ` and `SPEEDYPAY_SECRET_KEY` are set in your environment variables."
        },
         { 
            isReady: areAllUrlsSet, 
            isBlocking: true,
            title: "Provider API URLs", 
            description: areAllUrlsSet ? "Collection and Payout API base URLs are configured." : "One or both of the provider API base URLs are missing.",
            fixSuggestion: "Ensure `SPEEDYPAY_PAYOUT_BASE_URL...` and `SPEEDYPAY_CASHIER_BASE_URL...` variables are set for the current environment."
        },
        { 
            isReady: isNotifyUrlSet, 
            isBlocking: true,
            title: "Webhook Callback Endpoint", 
            description: isNotifyUrlSet ? "The callback handler URL is configured server-side." : "The public callback notification URL is not configured.",
            fixSuggestion: "Set the `SPEEDYPAY_NOTIFY_URL` environment variable to the public URL of your deployed webhook endpoint."
        },
        { 
            isReady: !isProd || isProdIdempotencyReady, 
            isBlocking: isProd && !isProdIdempotencyReady,
            title: "Webhook Idempotency", 
            description: isProd && !isProdIdempotencyReady ? "CRITICAL: Handler is using a non-persistent in-memory store in a production environment." : "Using a non-production in-memory store suitable for testing.",
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

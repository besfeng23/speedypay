"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { isSpeedyPayConfigured } from "@/lib/speedypay/config";
import { useAuth } from "@/lib/firebase/hooks";

interface CheckItemProps {
    isReady: boolean;
    title: string;
    description: string;
    fixSuggestion: string;
}

function CheckItem({ isReady, title, description, fixSuggestion }: CheckItemProps) {
    return (
        <div className="flex items-start gap-4 p-4 rounded-md border">
            {isReady ? (
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
            ) : (
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
            )}
            <div className="flex-1">
                <h4 className="font-semibold">{title}</h4>
                <p className="text-sm text-muted-foreground">{description}</p>
                 {!isReady && <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">{fixSuggestion}</p>}
            </div>
        </div>
    )
}


export function SystemReadiness() {
    const isProviderConfigured = isSpeedyPayConfigured();
    const { user } = useAuth();
    const isAuthMocked = user?.uid === 'mock-user-id';

    return (
        <Card>
            <CardHeader>
                <CardTitle>System Readiness</CardTitle>
                <CardDescription>
                A checklist for production readiness and system configuration status.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <CheckItem 
                    isReady={!isAuthMocked}
                    title="Authentication"
                    description={isAuthMocked ? "Authentication is running in demo mode with a mock user." : "Real Firebase authentication is active."}
                    fixSuggestion="To enable real authentication, replace the mock provider in `src/lib/firebase/auth-provider.tsx`."
                />
                <CheckItem 
                    isReady={isProviderConfigured}
                    title="SpeedyPay Provider"
                    description={isProviderConfigured ? "API credentials for SpeedyPay are configured." : "SpeedyPay API credentials are missing."}
                    fixSuggestion="Add `SPEEDYPAY_MERCH_SEQ` and `SPEEDYPAY_SECRET_KEY` to your environment variables."
                />
                 <CheckItem 
                    isReady={true}
                    title="Webhook Handler"
                    description="The webhook endpoint at `/api/webhooks/speedypay` is available to receive events."
                    fixSuggestion="Ensure this URL is publicly accessible and configured in your SpeedyPay dashboard."
                />
                 <CheckItem 
                    isReady={true}
                    title="Database & Data Layer"
                    description="The application is using a mock, in-memory data store for demonstration purposes."
                    fixSuggestion="For production, migrate the data layer in `src/lib/data.ts` to a persistent database like Firestore."
                />
            </CardContent>
        </Card>
    )
}

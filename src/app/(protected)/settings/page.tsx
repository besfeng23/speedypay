"use client";

import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { speedypayConfig, isSpeedyPayConfigured } from "@/lib/speedypay/config";
import { CheckCircle, XCircle, AlertTriangle, Terminal } from "lucide-react";
import { SystemReadiness } from "@/components/system-readiness";
import { useAuth } from "@/lib/firebase/hooks";

function IntegrationStatus() {
  const isConfigured = isSpeedyPayConfigured();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integration Status</CardTitle>
        <CardDescription>Readiness check for SpeedyPay integration.</CardDescription>
      </CardHeader>
      <CardContent>
        {isConfigured ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Ready</AlertTitle>
            <AlertDescription>
              All required API credentials are configured in the environment. The application is ready to communicate with SpeedyPay.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Configuration Missing</AlertTitle>
            <AlertDescription>
              One or more SpeedyPay API credentials are missing from your environment variables. The integration is disabled.
              <p className="mt-2 text-xs">Please check your <code>.env.local</code> file for `SPEEDYPAY_API_KEY`, `SPEEDYPAY_API_SECRET`, and `SPEEDYPAY_WEBHOOK_SECRET`.</p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

function WebhookInfo() {
  const isConfigured = !!speedypayConfig.webhookSecret;
  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/speedypay`
    : '/api/webhooks/speedypay';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook Endpoint</CardTitle>
        <CardDescription>Configure this endpoint in your SpeedyPay developer dashboard.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 p-2 rounded-md bg-muted">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <code className="text-sm font-mono flex-1">{webhookUrl}</code>
            <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(webhookUrl)}>Copy</Button>
        </div>
        <div className="flex items-center gap-2 text-sm">
            {isConfigured ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
            <span>Webhook secret is {isConfigured ? 'configured' : 'missing'}.</span>
        </div>
        <p className="text-xs text-muted-foreground">
          This endpoint listens for real-time events from SpeedyPay to update payment, settlement, and remittance statuses automatically.
        </p>
      </CardContent>
    </Card>
  )
}

function ProviderConfig() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider Credentials</CardTitle>
        <CardDescription>
          These values are placeholders read from your environment variables.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api-base-url">API Base URL</Label>
          <Input id="api-base-url" value={speedypayConfig.apiBaseUrl} readOnly disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="api-key">API Key</Label>
          <Input id="api-key" value={speedypayConfig.apiKey ? `spk_...${speedypayConfig.apiKey.slice(-4)}` : 'Not Set'} readOnly disabled />
        </div>
         <div className="space-y-2">
          <Label htmlFor="api-secret">API Secret</Label>
          <Input id="api-secret" type="password" value={speedypayConfig.apiSecret ? '••••••••••••••••' : ''} readOnly disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="webhook-secret">Webhook Secret</Label>
          <Input id="webhook-secret" type="password" value={speedypayConfig.webhookSecret ? '••••••••••••••••' : ''} readOnly disabled />
        </div>
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.claims?.role === 'admin';

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your account and application settings."
      />

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="integration">Integration</TabsTrigger>
          <TabsTrigger value="fees">Fee Configs</TabsTrigger>
          <TabsTrigger value="api">Platform API</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          {isAdmin && <TabsTrigger value="system">System</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>Update your personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" defaultValue="Admin User" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue="admin@speedypay.com" disabled/>
                </div>
                 <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="integration" className="grid md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <ProviderConfig />
            </div>
            <div className="space-y-6">
              <IntegrationStatus />
              <WebhookInfo />
            </div>
        </TabsContent>
        <TabsContent value="fees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Global Fee Configurations</CardTitle>
              <CardDescription>
                Manage global fee settings. These can be overridden at the merchant level.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Fee configuration management will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform API & Webhooks</CardTitle>
              <CardDescription>
                Manage your API keys and webhook endpoints for platform integration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Platform API and webhook settings will be available here.</p>
            </CardContent>
          </Card>
        </TabsContent>
         <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Manage how you receive notifications from the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Notification preferences will be configured here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        {isAdmin && (
            <TabsContent value="system" className="space-y-4">
                <SystemReadiness />
            </TabsContent>
        )}
      </Tabs>
    </>
  );
}

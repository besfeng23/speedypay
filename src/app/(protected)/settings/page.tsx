"use client";

import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
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
import { speedypayConfig, isSpeedyPayConfigured, getBaseUrl } from "@/lib/speedypay/config";
import { CheckCircle, AlertTriangle, Terminal, Loader2 } from "lucide-react";
import { SystemReadiness } from "@/components/system-readiness";
import { useAuth } from "@/lib/firebase/hooks";
import { payoutChannels } from "@/lib/speedypay/payout-channels";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { getProviderBalance } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

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
              <p className="mt-2 text-xs">Please check your environment file for `SPEEDYPAY_MERCH_SEQ` and `SPEEDYPAY_SECRET_KEY`.</p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

function WebhookInfo() {
  const webhookUrl = speedypayConfig.notifyUrl || (typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/speedypay`
    : '/api/webhooks/speedypay');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook Endpoint</CardTitle>
        <CardDescription>Configure this `notifyUrl` in your SpeedyPay merchant dashboard.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 p-2 rounded-md bg-muted">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <code className="text-sm font-mono flex-1">{webhookUrl}</code>
            <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(webhookUrl)}>Copy</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          This endpoint listens for real-time events from SpeedyPay to update payout statuses automatically.
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
          <Label htmlFor="api-base-url">API Base URL ({speedypayConfig.env})</Label>
          <Input id="api-base-url" value={getBaseUrl()} readOnly disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="merch-seq">Merchant Sequence (merchSeq)</Label>
          <Input id="merch-seq" value={speedypayConfig.merchSeq || 'Not Set'} readOnly disabled />
        </div>
         <div className="space-y-2">
          <Label htmlFor="api-secret">Secret Key</Label>
          <Input id="api-secret" type="password" value={speedypayConfig.secretKey ? '••••••••••••••••' : ''} readOnly disabled />
        </div>
      </CardContent>
    </Card>
  )
}

function PayoutChannels() {
    return (
        <Card>
             <CardHeader>
                <CardTitle>Supported Payout Channels</CardTitle>
                <CardDescription>List of currently supported channels for SpeedyPay payouts.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-96">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>procId</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Type</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payoutChannels.map(channel => (
                            <TableRow key={channel.procId}>
                                <TableCell className="font-mono text-xs">{channel.procId}</TableCell>
                                <TableCell>{channel.description}</TableCell>
                                <TableCell><Badge variant="outline">{channel.type}</Badge></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}

function ProviderBalance() {
    const [isLoading, setIsLoading] = useState(false);
    const [balance, setBalance] = useState<string | null>(null);
    const { toast } = useToast();

    const handleQueryBalance = async () => {
        setIsLoading(true);
        setBalance(null);
        const result = await getProviderBalance();
        if(result.success) {
            setBalance(result.data.balance);
        } else {
            toast({ variant: "destructive", title: "Failed to Query Balance", description: result.message });
        }
        setIsLoading(false);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Provider Balance</CardTitle>
                <CardDescription>Query your current merchant balance with SpeedyPay.</CardDescription>
            </CardHeader>
            <CardContent>
                {balance ? (
                    <p className="text-2xl font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PHP' }).format(Number(balance))}</p>
                ) : (
                    <p className="text-sm text-muted-foreground">Click the button to query your live balance.</p>
                )}
            </CardContent>
            <CardFooter>
                 <Button onClick={handleQueryBalance} disabled={isLoading || !isSpeedyPayConfigured()}>
                    {isLoading && <Loader2 className="animate-spin" />}
                    {isLoading ? 'Querying...' : 'Query Balance'}
                </Button>
            </CardFooter>
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

      <Tabs defaultValue="integration" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="integration">Payout Integration</TabsTrigger>
          <TabsTrigger value="fees">Fee Configs</TabsTrigger>
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
        <TabsContent value="integration" className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <ProviderConfig />
              <ProviderBalance />
            </div>
            <div className="space-y-6">
              <IntegrationStatus />
              <WebhookInfo />
            </div>
             <div className="lg:col-span-1">
                <PayoutChannels />
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
        {isAdmin && (
            <TabsContent value="system" className="space-y-4">
                <SystemReadiness />
            </TabsContent>
        )}
      </Tabs>
    </>
  );
}

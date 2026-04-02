"use client"

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
import { CheckCircle, AlertTriangle, Terminal, Copy, Wallet, Loader2, Server, Landmark, Building } from "lucide-react";
import { SystemReadiness } from "@/components/system-readiness";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { payoutChannels } from "@/lib/speedypay/payout-channels";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { getProviderBalance, getCollectionProviderBalance } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";

function IntegrationStatus() {
  const isConfigured = isSpeedyPayConfigured();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integration Status</CardTitle>
        <CardDescription>Live status of the SpeedyPay API integration.</CardDescription>
      </CardHeader>
      <CardContent>
        {isConfigured ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Ready</AlertTitle>
            <AlertDescription>
              All required API credentials are configured in the environment.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Configuration Missing</AlertTitle>
            <AlertDescription>
              One or more SpeedyPay API credentials are missing from your environment variables. The integration is disabled.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

function WebhookInfo() {
  const { toast } = useToast();
  const webhookUrl = speedypayConfig.notifyUrl || 'Not configured in environment';

  const handleCopy = () => {
    if (speedypayConfig.notifyUrl) {
        navigator.clipboard.writeText(speedypayConfig.notifyUrl);
        toast({ title: "Copied!", description: "Webhook URL copied to clipboard." });
    } else {
        toast({ variant: "destructive", title: "Cannot Copy", description: "Webhook URL is not configured." });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook Endpoint</CardTitle>
        <CardDescription>The URL to receive real-time events from SpeedyPay.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-4 p-2 rounded-md bg-muted">
            <Terminal className="h-4 w-4" />
            <code className="text-sm font-mono flex-1 truncate">{webhookUrl}</code>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
            </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          This value is read from the `SPEEDYPAY_NOTIFY_URL` environment variable.
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
          These values are read from your environment variables for security.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="payout-base-url">Payout API URL</Label>
          <Input id="payout-base-url" value={speedypayConfig.payoutBaseUrl} readOnly disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cashier-base-url">Cashier API URL</Label>
          <Input id="cashier-base-url" value={speedypayConfig.cashierBaseUrl} readOnly disabled />
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
                <CardTitle>Payout Channels</CardTitle>
                <CardDescription>Supported remittance channels from the provider.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>procId</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Type</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payoutChannels.map((channel) => (
                            <TableRow key={channel.procId}>
                                <TableCell className="font-mono text-xs">{channel.procId}</TableCell>
                                <TableCell>{channel.description}</TableCell>
                                <TableCell><Badge variant="outline">{channel.type}</Badge></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

function PayoutBalanceQuery() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [balance, setBalance] = useState<number | null>(null);

    const handleQuery = async () => {
        setIsLoading(true);
        setBalance(null);
        const result = await getProviderBalance();
        setIsLoading(false);
        if (result.success && result.data?.amount) {
            setBalance(result.data.amount);
            toast({ title: "Balance Updated", description: "Successfully queried provider payout balance."});
        } else {
            toast({ variant: "destructive", title: "Query Failed", description: result.message || "Could not retrieve balance."});
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Landmark/> Payout Balance</CardTitle>
                <CardDescription>Query your live balance with SpeedyPay for making payouts.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                    {balance !== null ? `PHP ${balance.toFixed(2)}` : <span className="text-muted-foreground">N/A</span>}
                </div>
                <Button onClick={handleQuery} disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Wallet />}
                    <span className="ml-2">{isLoading ? 'Querying...' : 'Query Payout Balance'}</span>
                </Button>
            </CardContent>
        </Card>
    )
}

function CollectionBalanceQuery() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [balance, setBalance] = useState<number | null>(null);

    const handleQuery = async () => {
        setIsLoading(true);
        setBalance(null);
        const result = await getCollectionProviderBalance();
        setIsLoading(false);
        if (result.success && result.data?.balance) {
            setBalance(result.data.balance);
            toast({ title: "Balance Updated", description: "Successfully queried provider collection balance."});
        } else {
            toast({ variant: "destructive", title: "Query Failed", description: result.message || "Could not retrieve balance."});
        }
    }

    return (
        <Card>
            <CardHeader>
                 <CardTitle className="flex items-center gap-2"><Building/> Collection Balance</CardTitle>
                <CardDescription>Query your live balance with SpeedyPay from received collections.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                    {balance !== null ? `PHP ${balance.toFixed(2)}` : <span className="text-muted-foreground">N/A</span>}
                </div>
                <Button onClick={handleQuery} disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Wallet />}
                    <span className="ml-2">{isLoading ? 'Querying...' : 'Query Collection Balance'}</span>
                </Button>
            </CardContent>
        </Card>
    )
}


export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your integration, fee structures, and system configurations."
      />

      <Tabs defaultValue="integration" className="space-y-4">
        <TabsList>
          <TabsTrigger value="integration">Integration</TabsTrigger>
          <TabsTrigger value="treasury">Treasury</TabsTrigger>
          <TabsTrigger value="fees">Fee Configs</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="integration" className="grid md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <ProviderConfig />
            </div>
            <div className="space-y-6">
              <IntegrationStatus />
              <WebhookInfo />
            </div>
        </TabsContent>
        <TabsContent value="treasury" className="grid md:grid-cols-2 gap-6">
            <div className="space-y-6">
                <CollectionBalanceQuery />
                <PayoutBalanceQuery />
            </div>
            <div className="space-y-6">
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
                 <EmptyState
                    icon={<Server />}
                    title="Feature Not Implemented"
                    description="Global and merchant-level fee configuration management will be available in a future update."
                    className="py-8"
                />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="system" className="space-y-4">
          <SystemReadiness />
        </TabsContent>
      </Tabs>
    </>
  );
}

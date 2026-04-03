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
import { speedypayConfig } from "@/lib/speedypay/config";
import { Copy, Wallet, Loader2, Server, Landmark, Building, HandCoins, Link as LinkIcon, Settings } from "lucide-react";
import { SystemReadiness } from "@/components/system-readiness";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { payoutChannels } from "@/lib/speedypay/payout-channels";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { getProviderBalance, getCollectionProviderBalance } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

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

function PayoutProviderConfig() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payout API Config</CardTitle>
        <CardDescription>
          Configuration for sending funds out (remittances).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="payout-base-url">Payout API URL</Label>
          <Input id="payout-base-url" value={speedypayConfig.payoutBaseUrl} readOnly disabled />
           <p className="text-xs text-muted-foreground">From `SPEEDYPAY_PAYOUT_BASE_URL...` env vars.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="payout-merch-seq">Merchant Sequence (merchSeq)</Label>
          <Input id="payout-merch-seq" value={speedypayConfig.merchSeq || 'Not Set'} readOnly disabled />
        </div>
         <div className="space-y-2">
          <Label htmlFor="payout-api-secret">Secret Key</Label>
          <Input id="payout-api-secret" type="password" value={speedypayConfig.secretKey ? '••••••••••••••••' : ''} readOnly disabled />
        </div>
      </CardContent>
    </Card>
  )
}

function CollectionProviderConfig() {
   return (
    <Card>
      <CardHeader>
        <CardTitle>Collection API Config</CardTitle>
        <CardDescription>
          Configuration for receiving funds from customers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cashier-base-url">Collection API URL</Label>
          <Input id="cashier-base-url" value={speedypayConfig.cashierBaseUrl} readOnly disabled />
           <p className="text-xs text-muted-foreground">From `SPEEDYPAY_CASHIER_BASE_URL...` env vars.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="collection-merch-seq">Merchant Sequence (merchSeq)</Label>
          <Input id="collection-merch-seq" value={speedypayConfig.merchSeq || 'Not Set'} readOnly disabled />
        </div>
         <div className="space-y-2">
          <Label htmlFor="collection-api-secret">Secret Key</Label>
          <Input id="collection-api-secret" type="password" value={speedypayConfig.secretKey ? '••••••••••••••••' : ''} readOnly disabled />
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

      <Tabs defaultValue="system" className="space-y-4">
        <TabsList>
          <TabsTrigger value="system">System Readiness</TabsTrigger>
          <TabsTrigger value="provider">Provider Configuration</TabsTrigger>
          <TabsTrigger value="treasury">Treasury</TabsTrigger>
          <TabsTrigger value="fees">Fee Configs</TabsTrigger>
          <TabsTrigger value="release">About</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-4">
          <SystemReadiness />
        </TabsContent>

        <TabsContent value="provider" className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
                <CollectionProviderConfig />
            </div>
             <div className="space-y-6">
              <PayoutProviderConfig />
            </div>
            <div className="space-y-6">
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
              <CardTitle>Fee Configurations</CardTitle>
              <CardDescription>
                How transaction fees are calculated and applied.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Currently, fee configurations are managed on a per-merchant basis. Each merchant has a `defaultFeeType` (`percentage` or `fixed`) and a `defaultFeeValue` which are set when the merchant is created or edited.
                </p>
                <p className="text-sm text-muted-foreground">
                    This provides flexibility to offer different rates to different merchants. All fee calculations are performed by trusted server-side logic to ensure integrity.
                </p>
                <Link href="/merchants">
                    <Button variant="outline">
                        <Settings className="mr-2 h-4 w-4" />
                        Manage Merchant Fees
                    </Button>
                </Link>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="release" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>About SpeedyPay Marketplace Console</CardTitle>
              <CardDescription>
                Version 1.0.0 - Production Ready
              </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">This console provides a comprehensive interface for managing a marketplace payments platform, including merchant onboarding, payment processing, settlement orchestration, and financial reconciliation.</p>
                <h4 className="font-semibold mt-4 mb-2">Key Modules Implemented:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Executive Dashboard & Financial Overview</li>
                    <li>Full Merchant CRUD and Management</li>
                    <li>Payment Transaction Lifecycle Viewing</li>
                    <li>Settlement & Remittance Orchestration</li>
                    <li>Live Provider Balance & Status Querying</li>
                    <li>End-to-End UAT & Operator Testing Suite</li>
                    <li>Comprehensive Audit Logging</li>
                    <li>AI-Powered Simulation & Insights Tools</li>
                    <li>System Readiness & Deployment Checklist</li>
                </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

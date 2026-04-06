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
import { Copy, Wallet, Loader2, Server, Landmark, Building, HandCoins, Link as LinkIcon, Settings } from "lucide-react";
import { SystemReadiness } from "@/components/system-readiness";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { payoutChannels } from "@/lib/speedypay/payout-channels";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { getProviderBalance, getCollectionProviderBalance, getPublicProviderConfig, getAllocationRules, findEntityById } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { AllocationRule, Entity } from "@/lib/types";

type PublicProviderConfig = {
  env: string;
  payoutBaseUrl: string;
  cashierBaseUrl: string;
  notifyUrlConfigured: boolean;
  merchSeqConfigured: boolean;
  secretKeyConfigured: boolean;
};

function WebhookInfo({ config }: { config: PublicProviderConfig | null }) {
  const { toast } = useToast();
  const webhookUrl = config?.notifyUrlConfigured ? 'Configured (server-only value hidden)' : 'Not configured in environment';

  const handleCopy = () => {
      toast({ title: "Security Notice", description: "Webhook URL is server-only and not exposed to the client." });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook Endpoint</CardTitle>
        <CardDescription>The URL to receive real-time events from SpeedyPay. This value is read from the `SPEEDYPAY_NOTIFY_URL` environment variable.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 p-2 rounded-md bg-muted/50 border">
            <code className="text-sm font-mono flex-1 truncate">{webhookUrl}</code>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
            </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function PayoutProviderConfig({ config }: { config: PublicProviderConfig | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payout API Config</CardTitle>
        <CardDescription>
          Configuration for sending funds out (remittances). Read from `SPEEDYPAY_...` env vars.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="payout-base-url">Payout API URL</Label>
          <Input id="payout-base-url" value={config?.payoutBaseUrl ?? 'Not Set'} readOnly disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payout-merch-seq">Merchant Sequence (merchSeq)</Label>
          <Input id="payout-merch-seq" value={config?.merchSeqConfigured ? 'Configured' : 'Not Set'} readOnly disabled />
        </div>
         <div className="space-y-2">
          <Label htmlFor="payout-api-secret">Secret Key</Label>
          <Input id="payout-api-secret" type="password" value={config?.secretKeyConfigured ? '••••••••••••••••' : 'Not Set'} readOnly disabled />
        </div>
      </CardContent>
    </Card>
  )
}

function CollectionProviderConfig({ config }: { config: PublicProviderConfig | null }) {
   return (
    <Card>
      <CardHeader>
        <CardTitle>Collection API Config</CardTitle>
        <CardDescription>
          Configuration for receiving funds from customers. Read from `SPEEDYPAY_...` env vars.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cashier-base-url">Collection API URL</Label>
          <Input id="cashier-base-url" value={config?.cashierBaseUrl ?? 'Not Set'} readOnly disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="collection-merch-seq">Merchant Sequence (merchSeq)</Label>
          <Input id="collection-merch-seq" value={config?.merchSeqConfigured ? 'Configured' : 'Not Set'} readOnly disabled />
        </div>
         <div className="space-y-2">
          <Label htmlFor="collection-api-secret">Secret Key</Label>
          <Input id="collection-api-secret" type="password" value={config?.secretKeyConfigured ? '••••••••••••••••' : 'Not Set'} readOnly disabled />
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
                            <TableHead>Description</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>procId</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payoutChannels.map((channel) => (
                            <TableRow key={channel.procId}>
                                <TableCell className="font-medium">{channel.description}</TableCell>
                                <TableCell><Badge variant="outline">{channel.type}</Badge></TableCell>
                                <TableCell className="font-mono text-xs">{channel.procId}</TableCell>
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
                    {balance !== null ? `PHP ${balance.toFixed(2)}` : <span className="text-muted-foreground text-base">Not queried</span>}
                </div>
                <Button onClick={handleQuery} disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Wallet />}
                    <span className="ml-2">{isLoading ? 'Querying...' : 'Query Now'}</span>
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
                     {balance !== null ? `PHP ${balance.toFixed(2)}` : <span className="text-muted-foreground text-base">Not queried</span>}
                </div>
                <Button onClick={handleQuery} disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Wallet />}
                    <span className="ml-2">{isLoading ? 'Querying...' : 'Query Now'}</span>
                </Button>
            </CardContent>
        </Card>
    )
}

function AllocationRulesTable() {
    const [rules, setRules] = useState<AllocationRule[]>([]);
    const [entities, setEntities] = useState<Map<string, Entity>>(new Map());

    useEffect(() => {
        getAllocationRules().then(async (fetchedRules) => {
            setRules(fetchedRules);
            const entityIds = [...new Set(fetchedRules.map(r => r.recipientEntityId))];
            const fetchedEntities = await Promise.all(entityIds.map(id => findEntityById(id)));
            setEntities(new Map(fetchedEntities.filter(Boolean).map(e => [e!.id, e!])));
        });
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Allocation Rules</CardTitle>
                <CardDescription>
                    These rules deterministically allocate funds from each payment. They are applied in order of priority.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Priority</TableHead>
                            <TableHead>Rule Type</TableHead>
                            <TableHead>Recipient</TableHead>
                             <TableHead>Scope</TableHead>
                            <TableHead>Value</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rules.map((rule) => (
                            <TableRow key={rule.id}>
                                <TableCell>{rule.priority}</TableCell>
                                <TableCell><Badge variant="secondary">{rule.ruleType.replace(/_/g, ' ')}</Badge></TableCell>
                                <TableCell>{entities.get(rule.recipientEntityId)?.displayName || 'Unknown'}</TableCell>
                                <TableCell>{rule.merchantAccountId ? 'Merchant' : rule.tenantId ? 'Tenant' : 'Global'}</TableCell>
                                <TableCell>
                                    {rule.percentageValue !== null ? `${rule.percentageValue}%` : ''}
                                    {rule.percentageValue !== null && rule.flatValue !== null ? ' + ' : ''}
                                    {rule.flatValue !== null ? `PHP ${rule.flatValue.toFixed(2)}` : ''}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}


export default function SettingsPage() {
  const [providerConfig, setProviderConfig] = useState<PublicProviderConfig | null>(null);

  useEffect(() => {
    void getPublicProviderConfig().then((result) => {
      if (result.success && result.data) setProviderConfig(result.data);
    });
  }, []);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your integration, fee structures, and system configurations."
      />

      <div className="grid md:grid-cols-[200px_1fr] lg:grid-cols-[250px_1fr] gap-10">
        <Tabs defaultValue="system" className="space-y-4 md:hidden">
            <TabsList>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="provider">Provider</TabsTrigger>
            <TabsTrigger value="treasury">Treasury</TabsTrigger>
            <TabsTrigger value="fees">Fees</TabsTrigger>
            <TabsTrigger value="release">About</TabsTrigger>
            </TabsList>
        </Tabs>
        <Tabs defaultValue="system" orientation="vertical" className="hidden md:block">
            <TabsList className="w-full">
            <TabsTrigger value="system" className="w-full justify-start">System Readiness</TabsTrigger>
            <TabsTrigger value="provider" className="w-full justify-start">Provider Config</TabsTrigger>
            <TabsTrigger value="treasury" className="w-full justify-start">Treasury</TabsTrigger>
            <TabsTrigger value="fees" className="w-full justify-start">Fee Configs</TabsTrigger>
            <TabsTrigger value="release" className="w-full justify-start">About</TabsTrigger>
            </TabsList>
        </Tabs>

        <div className="mt-2 md:mt-0">
            <Tabs defaultValue="system" className="space-y-4">
                <TabsContent value="system" className="space-y-4 m-0">
                <SystemReadiness />
                </TabsContent>

                <TabsContent value="provider" className="grid lg:grid-cols-2 gap-6 m-0">
                    <div className="space-y-6">
                        <CollectionProviderConfig config={providerConfig} />
                    </div>
                    <div className="space-y-6">
                        <PayoutProviderConfig config={providerConfig} />
                    </div>
                    <div className="lg:col-span-2">
                        <WebhookInfo config={providerConfig} />
                    </div>
                </TabsContent>
                <TabsContent value="treasury" className="grid lg:grid-cols-2 gap-6 m-0">
                    <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
                        <CollectionBalanceQuery />
                        <PayoutBalanceQuery />
                    </div>
                    <div className="lg:col-span-2">
                        <PayoutChannels />
                    </div>
                </TabsContent>
                <TabsContent value="fees" className="space-y-4 m-0">
                    <AllocationRulesTable />
                </TabsContent>
                
                <TabsContent value="release" className="space-y-4 m-0">
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
        </div>
      </div>
    </>
  );
}

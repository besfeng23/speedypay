'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition, useEffect } from 'react';
import { MerchantSchema, type MerchantFormValues } from '@/lib/schemas';
import { createMerchant } from '@/lib/actions';
import { Loader2 } from 'lucide-react';
import { payoutChannels } from '@/lib/speedypay/payout-channels';
import { ONBOARDING_STATUSES, MERCHANT_OF_RECORD_TYPES, PROVIDER_MERCHANT_MODES, SETTLEMENT_MODES, SETTLEMENT_SCHEDULES } from '@/lib/types';
import type { Tenant } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

interface NewMerchantPageClientProps {
  tenants: Tenant[];
}

export default function NewMerchantPageClient({ tenants }: NewMerchantPageClientProps) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const tenantIdFromQuery = searchParams.get('tenantId');

  const form = useForm<MerchantFormValues>({
    resolver: zodResolver(MerchantSchema),
    defaultValues: {
      tenantId: tenantIdFromQuery || tenants[0]?.id || "",
      businessName: "",
      displayName: "",
      contactName: "",
      email: "",
      mobile: "",
      settlementAccountName: "",
      settlementAccountNumberOrWalletId: "",
      defaultPayoutChannel: "GCASH",
      onboardingStatus: "pending",
      defaultFeeType: "percentage",
      defaultFeeValue: 2.9,
      
      // New fields with defaults
      merchantOfRecordType: 'platform',
      providerMerchantMode: 'master_only',
      settlementMode: 'internal_payout',
      settlementSchedule: 'manual',
      
      notes: "",
    },
  });
  
  useEffect(() => {
    if (tenantIdFromQuery) {
      form.setValue('tenantId', tenantIdFromQuery);
    }
  }, [tenantIdFromQuery, form]);

  function onSubmit(values: MerchantFormValues) {
    startTransition(async () => {
        const result = await createMerchant(values);
        if (result.success) {
            toast({
              title: "Merchant Created",
              description: `${values.businessName} has been added successfully.`,
            });
            router.push(`/tenants/${values.tenantId}`);
        } else {
            toast({
              variant: "destructive",
              title: "Error Creating Merchant",
              description: result.message || "An unknown error occurred.",
            });
        }
    });
  }

  if (tenants.length === 0) {
    return (
      <>
        <PageHeader title="New Merchant" description="Add a new client merchant to the platform."/>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">You must create a Tenant before you can add a Merchant.</p>
            <Button onClick={() => router.push('/tenants/new')} className="mt-4">Create a Tenant</Button>
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="New Merchant"
        description="Add a new client merchant to the platform."
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Business Details</CardTitle>
                   <CardDescription>Enter the legal and contact information for the merchant.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="tenantId" render={({ field }) => ( 
                        <FormItem className="md:col-span-2"> 
                            <FormLabel>Parent Tenant</FormLabel> 
                            <FormControl>
                                <Select onValueChange={field.onChange} defaultValue={field.value}> 
                                    <SelectTrigger> <SelectValue placeholder="Select a tenant..."/> </SelectTrigger>
                                    <SelectContent> {tenants.map(tenant => ( <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem> ))} </SelectContent> 
                                </Select> 
                            </FormControl>
                            <FormMessage /> 
                        </FormItem> 
                    )}/>
                    <FormField control={form.control} name="businessName" render={({ field }) => ( <FormItem> <FormLabel>Business Name</FormLabel> <FormControl> <Input placeholder="e.g., Starlight Apartments" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="displayName" render={({ field }) => ( <FormItem> <FormLabel>Display Name</FormLabel> <FormControl> <Input placeholder="e.g., Starlight Apts" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="contactName" render={({ field }) => ( <FormItem> <FormLabel>Contact Name</FormLabel> <FormControl> <Input placeholder="e.g., Alice Johnson" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Contact Email</FormLabel> <FormControl> <Input type="email" placeholder="e.g., alice@starlight.com" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="mobile" render={({ field }) => ( <FormItem> <FormLabel>Mobile Number</FormLabel> <FormControl> <Input placeholder="e.g., +1 555 123 4567" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Settlement & Fees</CardTitle>
                   <CardDescription>Configure how the merchant will receive payouts and how fees are applied.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="defaultPayoutChannel" render={({ field }) => ( 
                        <FormItem> 
                            <FormLabel>Default Payout Channel</FormLabel> 
                            <FormControl>
                                <Select onValueChange={field.onChange} defaultValue={field.value}> 
                                    <SelectTrigger> <SelectValue placeholder="Select a channel"/> </SelectTrigger>
                                    <SelectContent> {payoutChannels.map(channel => ( <SelectItem key={channel.procId} value={channel.procId}>{channel.description}</SelectItem> ))} </SelectContent> 
                                </Select>
                            </FormControl>
                            <FormDescription>The default method for sending payouts.</FormDescription>
                            <FormMessage /> 
                        </FormItem> 
                    )}/>
                    <FormField control={form.control} name="settlementAccountName" render={({ field }) => ( <FormItem> <FormLabel>Recipient Account Name</FormLabel> <FormControl> <Input placeholder="e.g., Alice B. Johnson" {...field} /> </FormControl><FormDescription>Full legal name of the account holder.</FormDescription> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="settlementAccountNumberOrWalletId" render={({ field }) => ( <FormItem className="md:col-span-2"> <FormLabel>Recipient Account / Wallet ID</FormLabel> <FormControl> <Input placeholder="Enter bank account # or mobile #" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    <Separator className="md:col-span-2"/>
                    <FormField control={form.control} name="defaultFeeType" render={({ field }) => ( 
                        <FormItem> 
                            <FormLabel>Default Fee Type</FormLabel> 
                            <FormControl>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger> <SelectValue placeholder="Select a fee type"/> </SelectTrigger>
                                    <SelectContent> <SelectItem value="percentage">Percentage</SelectItem> <SelectItem value="fixed">Fixed</SelectItem> </SelectContent> 
                                </Select>
                            </FormControl>
                            <FormMessage /> 
                        </FormItem> 
                    )}/>
                    <FormField control={form.control} name="defaultFeeValue" render={({ field }) => ( <FormItem> <FormLabel>Default Fee Value</FormLabel> <FormControl> <Input type="number" step="0.01" placeholder="e.g., 2.9" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                    <CardTitle>Platform Configuration</CardTitle>
                    <CardDescription>Define how this merchant is treated by the platform and payment provider.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="merchantOfRecordType" render={({ field }) => ( 
                        <FormItem> 
                            <FormLabel>Merchant of Record</FormLabel> 
                            <FormControl>
                                <Select onValueChange={field.onChange} defaultValue={field.value}> 
                                    <SelectTrigger> <SelectValue placeholder="Select MoR type"/> </SelectTrigger>
                                    <SelectContent> {MERCHANT_OF_RECORD_TYPES.map(type => ( <SelectItem key={type} value={type} className="capitalize">{type.replace('_', ' ')}</SelectItem> ))} </SelectContent> 
                                </Select>
                            </FormControl>
                            <FormDescription>Who is legally responsible for the transaction?</FormDescription>
                            <FormMessage /> 
                        </FormItem> 
                    )}/>
                    <FormField control={form.control} name="providerMerchantMode" render={({ field }) => ( 
                        <FormItem> 
                            <FormLabel>Provider Mode</FormLabel> 
                            <FormControl>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger> <SelectValue placeholder="Select provider mode"/> </SelectTrigger>
                                    <SelectContent> {PROVIDER_MERCHANT_MODES.map(type => ( <SelectItem key={type} value={type} className="capitalize">{type.replace('_', ' ')}</SelectItem> ))} </SelectContent> 
                                </Select>
                            </FormControl> 
                            <FormDescription>How is this merchant represented on the provider?</FormDescription>
                            <FormMessage /> 
                        </FormItem> 
                    )}/>
                    <FormField control={form.control} name="settlementMode" render={({ field }) => ( 
                        <FormItem> 
                            <FormLabel>Settlement Mode</FormLabel> 
                            <FormControl>
                                <Select onValueChange={field.onChange} defaultValue={field.value}> 
                                    <SelectTrigger> <SelectValue placeholder="Select settlement mode"/> </SelectTrigger>
                                    <SelectContent> {SETTLEMENT_MODES.map(type => ( <SelectItem key={type} value={type} className="capitalize">{type.replace('_', ' ')}</SelectItem> ))} </SelectContent> 
                                </Select> 
                            </FormControl>
                            <FormDescription>How are funds paid out to this merchant?</FormDescription>
                            <FormMessage /> 
                        </FormItem> 
                    )}/>
                    <FormField control={form.control} name="settlementSchedule" render={({ field }) => ( 
                        <FormItem> 
                            <FormLabel>Settlement Schedule</FormLabel> 
                            <FormControl>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger> <SelectValue placeholder="Select schedule"/> </SelectTrigger>
                                    <SelectContent> {SETTLEMENT_SCHEDULES.map(type => ( <SelectItem key={type} value={type} className="capitalize">{type.replace('_', ' ')}</SelectItem> ))} </SelectContent> 
                                </Select> 
                            </FormControl>
                            <FormDescription>When are payouts processed?</FormDescription>
                            <FormMessage /> 
                        </FormItem> 
                    )}/>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Status & Notes</CardTitle>
                         <CardDescription>Set the initial onboarding status and add any internal notes.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField control={form.control} name="onboardingStatus" render={({ field }) => ( 
                            <FormItem> 
                                <FormLabel>Onboarding Status</FormLabel> 
                                <FormControl>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <SelectTrigger> <SelectValue placeholder="Select a status"/> </SelectTrigger>
                                        <SelectContent> {ONBOARDING_STATUSES.map(status => ( <SelectItem key={status} value={status} className="capitalize">{status.replace('-', ' ')}</SelectItem> ))} </SelectContent> 
                                    </Select>
                                </FormControl>
                                <FormMessage /> 
                            </FormItem> 
                        )}/>
                        <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem> <FormLabel>Notes</FormLabel> <FormControl> <Textarea placeholder="Any internal notes about this merchant." className="min-h-[120px]" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    </CardContent>
                </Card>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => router.back()} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Creating..." : "Create Merchant"}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { getMerchantOnboardingSuggestions } from "@/ai/flows/merchant-onboarding-suggestions";
import { Bot, Loader2 } from "lucide-react";
import { useState } from "react";

const formSchema = z.object({
  businessName: z.string().min(2, "Business name is too short"),
  displayName: z.string().min(2, "Display name is too short"),
  contactName: z.string().min(2, "Contact name is too short"),
  email: z.string().email(),
  mobile: z.string(),
  settlementAccountName: z.string(),
  settlementAccountNumberOrWalletId: z.string(),
  settlementChannel: z.enum(["Bank Account", "Digital Wallet"]),
  onboardingStatus: z.enum(["Completed", "Pending", "In Review", "Rejected"]),
  defaultFeeType: z.enum(["percentage", "fixed"]),
  defaultFeeValue: z.coerce.number().positive(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewMerchantPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSuggesting, setIsSuggesting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessName: "",
      displayName: "",
      contactName: "",
      email: "",
      mobile: "",
      settlementAccountName: "",
      settlementAccountNumberOrWalletId: "",
      settlementChannel: "Bank Account",
      onboardingStatus: "Pending",
      defaultFeeType: "percentage",
      defaultFeeValue: 2.9,
    },
  });

  async function handleGetSuggestion() {
    setIsSuggesting(true);
    const businessType = form.getValues("businessName");
    if (!businessType) {
        toast({ variant: "destructive", title: "Business Name Required", description: "Please enter a business name to get suggestions." });
        setIsSuggesting(false);
        return;
    }
    try {
        const suggestions = await getMerchantOnboardingSuggestions({ businessType, country: "USA" });
        form.setValue("defaultFeeType", suggestions.suggestedFeeConfig.type);
        form.setValue("defaultFeeValue", suggestions.suggestedFeeConfig.value);
        form.setValue("notes", (form.getValues("notes") || "") + "\n\nAI KYC Summary:\n" + suggestions.kycRequirementsSummary);
        toast({ title: "AI Suggestions Applied", description: "Fee configuration and KYC notes have been updated." });
    } catch(e) {
        toast({ variant: "destructive", title: "Failed to get suggestions." });
    } finally {
        setIsSuggesting(false);
    }
  }


  function onSubmit(values: FormValues) {
    console.log(values);
    toast({
      title: "Merchant Created",
      description: `${values.businessName} has been added successfully.`,
    });
    router.push("/merchants");
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
                  <CardDescription>Enter the primary information for the merchant.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="businessName" render={({ field }) => ( <FormItem> <FormLabel>Business Name</FormLabel> <FormControl> <Input placeholder="e.g., Starlight Apartments" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="displayName" render={({ field }) => ( <FormItem> <FormLabel>Display Name</FormLabel> <FormControl> <Input placeholder="e.g., Starlight Apts" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="contactName" render={({ field }) => ( <FormItem> <FormLabel>Contact Name</FormLabel> <FormControl> <Input placeholder="e.g., Alice Johnson" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Contact Email</FormLabel> <FormControl> <Input type="email" placeholder="e.g., alice@starlight.com" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="mobile" render={({ field }) => ( <FormItem> <FormLabel>Mobile Number</FormLabel> <FormControl> <Input placeholder="e.g., 555-0101" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Settlement & Fees</CardTitle>
                  <CardDescription>Configure where and how to send money to this merchant.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="settlementChannel" render={({ field }) => ( <FormItem> <FormLabel>Settlement Channel</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl> <SelectTrigger> <SelectValue placeholder="Select a channel"/> </SelectTrigger> </FormControl> <SelectContent> <SelectItem value="Bank Account">Bank Account</SelectItem> <SelectItem value="Digital Wallet">Digital Wallet</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="settlementAccountName" render={({ field }) => ( <FormItem> <FormLabel>Account Name</FormLabel> <FormControl> <Input placeholder="e.g., Starlight Ops" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="settlementAccountNumberOrWalletId" render={({ field }) => ( <FormItem className="md:col-span-2"> <FormLabel>Account Number / Wallet ID</FormLabel> <FormControl> <Input placeholder="Enter account details" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>

                    <FormField control={form.control} name="defaultFeeType" render={({ field }) => ( <FormItem> <FormLabel>Default Fee Type</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl> <SelectTrigger> <SelectValue placeholder="Select a fee type"/> </SelectTrigger> </FormControl> <SelectContent> <SelectItem value="percentage">Percentage</SelectItem> <SelectItem value="fixed">Fixed</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="defaultFeeValue" render={({ field }) => ( <FormItem> <FormLabel>Default Fee Value</FormLabel> <FormControl> <Input type="number" step="0.1" placeholder="e.g., 2.9" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>AI Onboarding Assistant</CardTitle>
                        <CardDescription>Get AI-powered suggestions for fee structures and KYC requirements.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button type="button" variant="outline" className="w-full" onClick={handleGetSuggestion} disabled={isSuggesting}>
                           {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Bot className="mr-2 h-4 w-4"/>}
                            {isSuggesting ? 'Analyzing...' : 'Get Suggestions'}
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Status & Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField control={form.control} name="onboardingStatus" render={({ field }) => ( <FormItem> <FormLabel>Onboarding Status</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl> <SelectTrigger> <SelectValue placeholder="Select a status"/> </SelectTrigger> </FormControl> <SelectContent> <SelectItem value="Pending">Pending</SelectItem> <SelectItem value="In Review">In Review</SelectItem> <SelectItem value="Completed">Completed</SelectItem> <SelectItem value="Rejected">Rejected</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                        <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem> <FormLabel>Notes</FormLabel> <FormControl> <Textarea placeholder="Any internal notes about this merchant." className="min-h-[120px]" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    </CardContent>
                </Card>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit">Create Merchant</Button>
          </div>
        </form>
      </Form>
    </>
  );
}

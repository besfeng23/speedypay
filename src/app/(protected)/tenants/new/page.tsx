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
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { TenantSchema, type TenantFormValues } from '@/lib/schemas';
import { createTenant } from '@/lib/actions';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';


function NewTenantPageClient() {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<TenantFormValues>({
    resolver: zodResolver(TenantSchema),
    defaultValues: {
      name: "",
      platformFeeType: "percentage",
      platformFeeValue: 0.2,
      notes: "",
    },
  });

  function onSubmit(values: TenantFormValues) {
    startTransition(async () => {
        const result = await createTenant(values);
        if (result.success) {
            toast({
              title: "Tenant Created",
              description: `${values.name} has been added successfully.`,
            });
            router.push("/tenants");
        } else {
            toast({
              variant: "destructive",
              title: "Error Creating Tenant",
              description: result.message || "An unknown error occurred.",
            });
        }
    });
  }

  return (
    <>
      <PageHeader
        title="New Tenant"
        description="Add a new client tenant to the platform."
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Tenant Details</CardTitle>
                   <CardDescription>Enter the primary information for this tenant.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Tenant Name</FormLabel> <FormControl> <Input placeholder="e.g., Collo Inc." {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem> <FormLabel>Notes</FormLabel> <FormControl> <Textarea placeholder="Any internal notes about this tenant." className="min-h-[120px]" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Platform Fee Configuration</CardTitle>
                   <CardDescription>Configure how your platform will earn from this tenant's transactions.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="platformFeeType" render={({ field }) => ( <FormItem> <FormLabel>Platform Fee Type</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl> <SelectTrigger> <SelectValue placeholder="Select a fee type"/> </SelectTrigger> </FormControl> <SelectContent> <SelectItem value="percentage">Percentage</SelectItem> <SelectItem value="fixed">Fixed</SelectItem> </SelectContent> </Select> <FormDescription>How your platform fee is calculated.</FormDescription><FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="platformFeeValue" render={({ field }) => ( <FormItem> <FormLabel>Platform Fee Value</FormLabel> <FormControl> <Input type="number" step="0.01" placeholder="e.g., 0.2" {...field} /> </FormControl><FormDescription>e.g., 0.2 for 0.2% or 5 for 5 PHP.</FormDescription> <FormMessage /> </FormItem> )}/>
                </CardContent>
              </Card>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => router.back()} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Creating..." : "Create Tenant"}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}

export default dynamic(() => Promise.resolve(NewTenantPageClient), {
  ssr: false,
});

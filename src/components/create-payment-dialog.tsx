"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Loader2, Copy, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { createCollectionPayment } from "@/lib/actions";
import { CreatePaymentSchema, type CreatePaymentFormValues } from "@/lib/schemas";
import type { Merchant } from "@/lib/types";

export function CreatePaymentDialog({ merchants }: { merchants: Merchant[] }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<CreatePaymentFormValues>({
    resolver: zodResolver(CreatePaymentSchema),
    defaultValues: {
      merchantId: merchants[0]?.id || "",
      amount: 100.00,
      description: "Manual payment request",
    },
  });

  const onSubmit = async (values: CreatePaymentFormValues) => {
    setIsLoading(true);
    setPaymentUrl(null);
    const result = await createCollectionPayment(values);
    setIsLoading(false);

    if (result.success) {
      setPaymentUrl(result.data.paymentUrl);
      toast({ title: "Payment Link Created", description: "The payment link is ready to be shared." });
      router.refresh(); // Refresh the page to show the new payment in the list
    } else {
      toast({ variant: "destructive", title: "Creation Failed", description: result.message });
    }
  };

  const handleCopy = () => {
    if (paymentUrl) {
      navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        // Reset state when closing
        form.reset({
          merchantId: merchants[0]?.id || "",
          amount: 100.00,
          description: "Manual payment request",
        });
        setPaymentUrl(null);
        setIsLoading(false);
    }
    setOpen(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Payment</DialogTitle>
          <DialogDescription>
            Generate a unique payment link for a customer to pay.
          </DialogDescription>
        </DialogHeader>
        {paymentUrl ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">The payment link has been successfully created.</p>
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
                <Input value={paymentUrl} readOnly className="flex-1"/>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleCopy}>
                    {copied ? <Check className="text-green-500" /> : <Copy />}
                </Button>
            </div>
            <Button onClick={() => setOpen(false)} className="w-full">Done</Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="merchantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Merchant</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a merchant" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {merchants.map((merchant) => (
                          <SelectItem key={merchant.id} value={merchant.id}>
                            {merchant.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (PHP)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="100.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description / Remark</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Monthly Dues - Unit 101" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading && <Loader2 className="animate-spin" />}
                  {isLoading ? "Generating Link..." : "Generate Payment Link"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

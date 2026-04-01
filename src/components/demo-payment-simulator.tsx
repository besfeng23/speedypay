"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PlayCircle, Loader2 } from "lucide-react";
import { simulatePayment, type SimulatePaymentOutput } from "@/ai/flows/simulate-payment-flow";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "./ui/scroll-area";
import { merchants } from "@/lib/data";

const formSchema = z.object({
  scenarioType: z.enum([
    "success",
    "payment_failed",
    "settlement_failed",
    "remittance_failed",
  ]),
  grossAmount: z.coerce.number().positive(),
  merchantId: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export function DemoPaymentSimulator() {
  const [open, setOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulatePaymentOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      scenarioType: "success",
      grossAmount: 100,
      merchantId: merchants[0].id,
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSimulating(true);
    setSimulationResult(null);
    const merchant = merchants.find(m => m.id === values.merchantId);
    if (!merchant) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selected merchant not found.' });
      setIsSimulating(false);
      return;
    }

    try {
      const result = await simulatePayment({
        scenarioType: values.scenarioType,
        grossAmount: values.grossAmount,
        currency: "USD",
        feeType: merchant.defaultFeeType,
        feeValue: merchant.defaultFeeValue,
        merchantId: merchant.id,
        customerName: "Demo Customer",
        description: "Simulated via SpeedyPay Console",
      });
      setSimulationResult(result);
      toast({ title: 'Simulation Complete', description: `Successfully simulated a ${values.scenarioType} scenario.` });
    } catch (error) {
      console.error("Simulation failed:", error);
      toast({ variant: 'destructive', title: 'Simulation Failed', description: 'An error occurred during simulation.' });
    } finally {
      setIsSimulating(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <PlayCircle className="mr-2 h-4 w-4" />
          Simulate Payment
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Payment Flow Simulator</SheetTitle>
          <SheetDescription>
            Use this tool to simulate end-to-end payment scenarios. The AI will generate realistic payment and settlement records.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="py-4 pr-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="scenarioType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scenario</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a scenario" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="success">Success</SelectItem>
                          <SelectItem value="payment_failed">Payment Failed</SelectItem>
                          <SelectItem value="settlement_failed">Settlement Failed</SelectItem>
                          <SelectItem value="remittance_failed">Remittance Failed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                          {merchants.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.displayName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="grossAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gross Amount (USD)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="100.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSimulating} className="w-full">
                  {isSimulating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Run Simulation
                </Button>
              </form>
            </Form>

            {simulationResult && (
              <div className="mt-8 space-y-4">
                <h3 className="font-semibold text-lg">Simulation Result</h3>
                <div className="p-4 bg-muted/50 rounded-lg text-xs font-mono max-h-96 overflow-auto">
                    <pre>{JSON.stringify(simulationResult, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { useState } from "react";
import type { UATTestCase, UATLog, Payment, Settlement, Merchant } from "@/lib/types";
import { TestCaseCard } from "./test-case-card";
import { useToast } from "@/hooks/use-toast";
import { runUATTestAction } from "@/lib/actions";
import { groupBy } from "lodash";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "../ui/button";

interface UATRunnerProps {
  testCases: UATTestCase[];
  testLogs: UATLog[];
  recentPayments: Payment[];
  recentSettlements: Settlement[];
  merchants: Merchant[];
}

export function UATRunner({
  testCases,
  testLogs,
  recentPayments,
  recentSettlements,
  merchants
}: UATRunnerProps) {
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<UATLog | null>(null);
  const [inputModalOpen, setInputModalOpen] = useState(false);
  const [currentTest, setCurrentTest] = useState<UATTestCase | null>(null);

  // State for inputs
  const [amount, setAmount] = useState("10.00");
  const [selectedEntity, setSelectedEntity] = useState<string>("");

  const { toast } = useToast();

  const logsByTestCaseId = groupBy(testLogs, "testCaseId");

  const handleRunTest = async (testCase: UATTestCase) => {
    // If test requires input, open the modal first
    if (testCase.requiresInput) {
        setCurrentTest(testCase);
        // Pre-select the most recent entity if applicable
        if (testCase.requiresInput === 'latest_payment' && recentPayments.length > 0) {
            setSelectedEntity(recentPayments[0].id);
        } else if (testCase.requiresInput === 'latest_settlement' && recentSettlements.length > 0) {
            setSelectedEntity(recentSettlements[0].id);
        } else {
            setSelectedEntity("");
        }
        setInputModalOpen(true);
        return;
    }

    // Otherwise, run directly
    executeTest(testCase.id);
  };
  
  const handleModalSubmit = () => {
    if (!currentTest) return;
    
    let payload: any = {};
    if (currentTest.requiresInput === 'payment_amount') {
        const selectedMerchant = merchants[0]; // For simplicity, use the first merchant
        if (!selectedMerchant) {
            toast({ variant: "destructive", title: "Test Error", description: "No merchants available to run test." });
            return;
        }
        payload = { 
            amount: parseFloat(amount),
            merchantId: selectedMerchant.id,
            description: `UAT Test - ${currentTest.title}`
        };
    } else {
        payload = { entityId: selectedEntity };
    }
    
    setInputModalOpen(false);
    executeTest(currentTest.id, payload);
  }

  const executeTest = async (testCaseId: string, payload?: any) => {
    setRunningTestId(testCaseId);
    try {
      const result = await runUATTestAction(testCaseId, payload);
      if (result.success) {
        toast({
          title: "UAT Test Passed",
          description: result.message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "UAT Test Failed",
          description: result.message,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({
        variant: "destructive",
        title: "UAT Test Error",
        description: message,
      });
    } finally {
      setRunningTestId(null);
      setCurrentTest(null);
    }
  };
  
  const renderInputModal = () => {
    if (!currentTest || !currentTest.requiresInput) return null;

    let inputField;
    switch (currentTest.requiresInput) {
      case 'payment_amount':
        inputField = (
          <div>
            <Label htmlFor="amount">Amount (PHP)</Label>
            <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-2">A test payment link will be created for the first available merchant.</p>
          </div>
        );
        break;
      case 'latest_payment':
        inputField = (
          <div>
            <Label htmlFor="payment">Select Payment</Label>
            <Select onValueChange={setSelectedEntity} defaultValue={selectedEntity}>
              <SelectTrigger id="payment"><SelectValue placeholder="Select a recent payment..." /></SelectTrigger>
              <SelectContent>
                {recentPayments.map(p => <SelectItem key={p.id} value={p.id}>{p.id} ({p.customerName})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        );
        break;
      case 'latest_settlement':
         inputField = (
          <div>
            <Label htmlFor="settlement">Select Settlement</Label>
            <Select onValueChange={setSelectedEntity} defaultValue={selectedEntity}>
              <SelectTrigger id="settlement"><SelectValue placeholder="Select a recent settlement..." /></SelectTrigger>
              <SelectContent>
                {recentSettlements.map(s => <SelectItem key={s.id} value={s.id}>{s.id} (For Mer: {s.merchantId})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        );
        break;
      default:
        return null;
    }

    return (
      <Dialog open={inputModalOpen} onOpenChange={setInputModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Input Required for: {currentTest.title}</DialogTitle>
            <DialogDescription>Please provide the necessary information to run this test.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">{inputField}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInputModalOpen(false)}>Cancel</Button>
            <Button onClick={handleModalSubmit}>Run Test</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };


  const groupedCases = groupBy(testCases, 'section');

  return (
    <div className="space-y-8">
        {Object.entries(groupedCases).map(([section, cases]) => (
             <div key={section}>
                <h2 className="text-xl font-semibold tracking-tight mb-4">{section}</h2>
                <div className="grid gap-6">
                    {cases.map((tc) => {
                        const logs = logsByTestCaseId[tc.id] || [];
                        const latestLog = logs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                        return (
                        <TestCaseCard
                            key={tc.id}
                            testCase={tc}
                            latestLog={latestLog}
                            isRunning={runningTestId === tc.id}
                            onRunTest={() => handleRunTest(tc)}
                            onViewLastLog={() => setSelectedLog(latestLog)}
                        />
                        );
                    })}
                </div>
            </div>
        ))}
      
      {renderInputModal()}

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>UAT Log Details</DialogTitle>
            <DialogDescription>
              Raw provider response from the test run on {selectedLog && formatDistanceToNow(new Date(selectedLog.timestamp))} ago.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 bg-muted text-muted-foreground rounded-md p-4 text-xs max-h-96 overflow-auto">
            <pre>
              <code>{selectedLog?.providerResponse || "No provider response was logged."}</code>
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

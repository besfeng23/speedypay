"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { UATTestCase, UATLog, UATStatus } from "@/lib/types";
import { Play, Loader2, CheckCircle, XCircle, History } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TestCaseCardProps {
  testCase: UATTestCase;
  latestLog?: UATLog;
  isRunning: boolean;
  onRunTest: () => void;
  onViewLastLog: () => void;
}

const statusStyles: Record<UATStatus, string> = {
  "not tested": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  "passed": "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  "failed": "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  "needs retest": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
};

const statusIcons: Record<UATStatus, React.ReactNode> = {
    "not tested": <History className="h-3 w-3" />,
    "passed": <CheckCircle className="h-3 w-3" />,
    "failed": <XCircle className="h-3 w-3" />,
    "needs retest": <History className="h-3 w-3" />,
}

export function TestCaseCard({ testCase, latestLog, isRunning, onRunTest, onViewLastLog }: TestCaseCardProps) {
  const status: UATStatus = latestLog?.status === 'passed' ? 'passed' : latestLog?.status === 'failed' ? 'failed' : 'not tested';

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">{testCase.title}</CardTitle>
          <CardDescription className="text-xs mt-1">{testCase.description}</CardDescription>
        </div>
        <Badge variant="outline" className={`shrink-0 ${statusStyles[status]} flex items-center gap-1.5`}>
            {statusIcons[status]}
            {status}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-muted-foreground w-full">
          {latestLog ? (
            <div className="flex items-center gap-2">
                <span>Last run: {formatDistanceToNow(new Date(latestLog.timestamp), { addSuffix: true })}</span>
                <Button variant="link" size="sm" className="p-0 h-auto" onClick={onViewLastLog}>View Log</Button>
            </div>
          ) : (
            <span>This test has not been run yet.</span>
          )}
        </div>
        <Button onClick={onRunTest} disabled={isRunning} className="w-full sm:w-auto">
          {isRunning ? <Loader2 className="animate-spin" /> : <Play />}
          <span className="ml-2">{isRunning ? "Running..." : testCase.actionLabel}</span>
        </Button>
      </CardContent>
    </Card>
  );
}

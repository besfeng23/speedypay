import { PageHeader } from "@/components/page-header";
import { getUATTestCases, getUATLogs, getRecentPayments, getRecentSettlements, getMerchants, getAuditLogsByEventTypePrefix } from "@/lib/data";
import { UATRunner } from "@/components/uat/test-runner";
import type { Merchant, AuditLog } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Beaker, ArrowRightLeft } from "lucide-react";
import { RecentWebhooks } from "@/components/uat/recent-webhooks";


export default async function UATPage() {
  const testCases = await getUATTestCases();
  const testLogs = await getUATLogs();
  const recentPayments = await getRecentPayments(5);
  const recentSettlements = await getRecentSettlements(5);
  const merchants: Merchant[] = await getMerchants();
  const webhookLogs = await getAuditLogsByEventTypePrefix('webhook', 5);

  return (
    <>
      <PageHeader
        title="UAT & Operator Testing"
        description="Run end-to-end tests to validate the integration before production cutover."
      />
        <Alert className="mb-6">
            <Beaker className="h-4 w-4" />
            <AlertTitle>Testing Environment</AlertTitle>
            <AlertDescription>
                All tests run from this page will use the credentials and endpoints configured for your current environment (Test or Production). Ensure you are in a safe test environment before running actions.
            </AlertDescription>
        </Alert>
        
        <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                 <UATRunner
                    testCases={testCases}
                    testLogs={testLogs}
                    recentPayments={recentPayments}
                    recentSettlements={recentSettlements}
                    merchants={merchants}
                />
            </div>
            <div className="space-y-8">
                <RecentWebhooks initialLogs={webhookLogs} />
            </div>
        </div>
    </>
  );
}

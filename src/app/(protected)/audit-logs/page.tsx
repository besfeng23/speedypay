import { format } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { getAuditLogs } from "@/lib/data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AuditLog } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { FileClock } from "lucide-react";

export default async function AuditLogsPage() {
  const logs: AuditLog[] = await getAuditLogs();

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="A trail of all significant events and changes within the system."
      />
      <Card>
        <CardHeader>
            <CardTitle>Event History</CardTitle>
            <CardDescription>All system and user actions are recorded for traceability.</CardDescription>
        </CardHeader>
        <CardContent>
            {logs.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>Event Type</TableHead>
                            <TableHead>User/Actor</TableHead>
                            <TableHead>Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell className="whitespace-nowrap">
                                    <div className="font-medium">{format(new Date(log.timestamp), 'MMM d, yyyy, h:mm:ss a')}</div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{log.eventType}</Badge>
                                </TableCell>
                                <TableCell>
                                    {log.user}
                                </TableCell>
                                <TableCell className="max-w-md truncate">{log.details}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <EmptyState
                    icon={<FileClock />}
                    title="No Audit Logs"
                    description="No system or user actions have been recorded yet."
                />
            )}
        </CardContent>
      </Card>
    </>
  );
}

import { format, formatDistanceToNow } from "date-fns";
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
import { FileClock, CircleUser, Server, ArrowRightLeft, HandCoins, Building, Settings, CreditCard, Banknote, FlaskConical, AlertTriangle, ShieldCheck, FileQuestion } from "lucide-react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const eventTypeIcons: Record<string, React.ReactNode> = {
    'default': <FileQuestion />,
    'user': <CircleUser />,
    'system': <Server />,
    'payout': <HandCoins />,
    'collection': <CreditCard />,
    'merchant': <Building />,
    'settlement': <Banknote />,
    'provider': <Settings />,
    'simulation': <FlaskConical />,
    'webhook': <ArrowRightLeft />,
    'security': <ShieldCheck />,
    'uat': <FlaskConical />,
}

const getIconForEventType = (eventType: string) => {
    const category = eventType.split('.')[0]?.toLowerCase();
    return eventTypeIcons[category] || eventTypeIcons['default'];
}


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
            <CardDescription>All system and user actions are recorded for traceability and compliance.</CardDescription>
        </CardHeader>
        <CardContent>
            {logs.length > 0 ? (
                <TooltipProvider>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[180px]">Timestamp</TableHead>
                                <TableHead className="w-[40px] hidden md:table-cell"></TableHead>
                                <TableHead>Event</TableHead>
                                <TableHead>Actor</TableHead>
                                <TableHead className="hidden md:table-cell">Entity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log) => (
                                <TableRow key={log.id} className="align-top">
                                    <TableCell className="whitespace-nowrap">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="font-medium cursor-default">{formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {format(new Date(log.timestamp), 'MMM d, yyyy, h:mm:ss a')}
                                            </TooltipContent>
                                        </Tooltip>
                                        <div className="text-xs text-muted-foreground font-mono">{log.id}</div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <div className="p-2 bg-muted rounded-full w-fit">
                                            {getIconForEventType(log.eventType)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{log.eventType}</Badge>
                                        <p className="text-sm text-foreground mt-1 max-w-sm">{log.details}</p>
                                    </TableCell>
                                    <TableCell>
                                        {log.user}
                                    </TableCell>
                                     <TableCell className="hidden md:table-cell">
                                        {log.entityType && log.entityId ? (
                                            <div>
                                                <div className="text-xs uppercase text-muted-foreground">{log.entityType}</div>
                                                <Link href={`/${log.entityType.toLowerCase()}s/${log.entityId}`} className="font-mono text-xs text-primary hover:underline">
                                                    {log.entityId}
                                                </Link>
                                            </div>
                                        ) : <span className="text-muted-foreground">-</span>}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TooltipProvider>
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

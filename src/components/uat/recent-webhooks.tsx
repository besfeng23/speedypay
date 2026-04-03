"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import type { AuditLog } from "@/lib/types";
import { ArrowRightLeft, ShieldCheck, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "../ui/badge";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface RecentWebhooksProps {
    initialLogs: AuditLog[];
}

const getIconForWebhook = (eventType: string) => {
    if (eventType.includes('failure')) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (eventType.includes('security')) return <ShieldCheck className="h-4 w-4 text-orange-500" />;
    return <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />;
}

export function RecentWebhooks({ initialLogs }: RecentWebhooksProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Webhook Activity</CardTitle>
                <CardDescription>A live feed of the latest callbacks received from the provider.</CardDescription>
            </CardHeader>
            <CardContent>
                {initialLogs.length > 0 ? (
                    <TooltipProvider>
                        <div className="space-y-6">
                            {initialLogs.map(log => (
                                <div key={log.id} className="flex items-start gap-4">
                                     <div className="p-2 bg-secondary rounded-full mt-1">
                                        {getIconForWebhook(log.eventType)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">{log.eventType}</Badge>
                                             <Tooltip>
                                                <TooltipTrigger>
                                                    <span className="text-xs text-muted-foreground hover:underline cursor-default">
                                                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {new Date(log.timestamp).toISOString()}
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <p className="text-sm mt-1">{log.details}</p>
                                        {log.entityId && log.entityType && (
                                            <Link href={`/${log.entityType}s/${log.entityId}`} className="text-xs text-primary hover:underline font-mono">
                                                {log.entityId}
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TooltipProvider>
                ) : (
                    <EmptyState 
                        icon={<ArrowRightLeft />}
                        title="No Webhooks Received"
                        description="As the provider sends callbacks, they will appear here."
                        className="py-6"
                    />
                )}
            </CardContent>
        </Card>
    );
}

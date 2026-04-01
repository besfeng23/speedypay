"use client";

import { useState } from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { dashboardInsights, type DashboardInsightsInput, type DashboardInsightsOutput } from "@/ai/flows/dashboard-summary-insights";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

interface DashboardInsightsProps {
    kpiData: DashboardInsightsInput;
}

export function DashboardInsights({ kpiData }: DashboardInsightsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<DashboardInsightsOutput | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const handleGenerateInsights = async () => {
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const insights = await dashboardInsights(kpiData);
            setResult(insights);
            toast({
                title: "Insights Generated",
                description: "AI-powered analysis is ready.",
            });
        } catch (e) {
            console.error(e);
            setError("Failed to generate insights. The AI model might be temporarily unavailable.");
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not generate AI insights.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>AI-Powered Insights</CardTitle>
                    <CardDescription>Actionable recommendations based on your data.</CardDescription>
                </div>
                 <Button onClick={handleGenerateInsights} disabled={isLoading} size="sm">
                    {isLoading ? <Loader2 className="animate-spin" /> : <Bot />}
                    <span className="ml-2 hidden md:inline">{isLoading ? "Analyzing..." : "Generate Insights"}</span>
                </Button>
            </CardHeader>
            <CardContent>
                {isLoading && (
                     <div className="space-y-4">
                        <div className="h-4 w-3/4 rounded-md bg-muted animate-pulse" />
                        <div className="h-4 w-full rounded-md bg-muted animate-pulse" />
                        <div className="h-4 w-1/2 rounded-md bg-muted animate-pulse" />
                    </div>
                )}
                {error && (
                    <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {result ? (
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold mb-2">Performance Summary</h4>
                            <p className="text-sm text-muted-foreground">{result.summary}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Actionable Insights</h4>
                            <ul className="space-y-2">
                                {result.actionableInsights.map((insight, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <Sparkles className="h-4 w-4 mt-1 text-primary shrink-0" />
                                        <span className="text-sm text-muted-foreground">{insight}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ) : (
                    !isLoading && !error && (
                        <div className="text-center text-sm text-muted-foreground py-6">
                            <Bot className="mx-auto h-8 w-8 mb-2" />
                            Click 'Generate Insights' to get an AI-powered summary of your marketplace performance.
                        </div>
                    )
                )}
            </CardContent>
        </Card>
    );
}

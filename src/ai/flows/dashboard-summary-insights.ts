'use server';
/**
 * @fileOverview This file contains the Genkit flow for generating AI-powered summaries and actionable insights
 * for the SpeedyPay Marketplace Console dashboard. It takes key financial metrics as input
 * and provides an overall performance summary and specific actionable recommendations.
 *
 * - dashboardInsights - A function that triggers the AI-generated dashboard insights.
 * - DashboardInsightsInput - The input type for the dashboardInsights function.
 * - DashboardInsightsOutput - The return type for the dashboardInsights function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DashboardInsightsInputSchema = z.object({
  totalGrossVolume: z.number().describe('The total gross transaction volume over a period.'),
  totalPlatformFees: z.number().describe('The total platform fees earned over a period.'),
  totalMerchantNetRemittances: z.number().describe('The total net remittances made to merchants over a period.'),
  pendingSettlements: z.number().describe('The number of settlements currently pending.'),
  failedSettlements: z.number().describe('The number of settlements that have failed.'),
  activeMerchants: z.number().describe('The total number of active merchants.'),
  recentTransactionsCount: z.number().describe('The count of recent transactions (e.g., last 24 hours/7 days).'),
  recentSettlementEventsCount: z.number().describe('The count of recent settlement events (e.g., last 24 hours/7 days).'),
  currency: z.string().optional().describe('The currency code for the monetary values (e.g., "USD"). Defaults to USD if not provided.'),
});
export type DashboardInsightsInput = z.infer<typeof DashboardInsightsInputSchema>;

const DashboardInsightsOutputSchema = z.object({
  summary: z.string().describe('An AI-generated summary of the dashboard performance trends.'),
  actionableInsights: z.array(z.string()).describe('A list of actionable insights derived from the dashboard metrics.'),
});
export type DashboardInsightsOutput = z.infer<typeof DashboardInsightsOutputSchema>;

export async function dashboardInsights(input: DashboardInsightsInput): Promise<DashboardInsightsOutput> {
  return dashboardInsightsFlow(input);
}

const dashboardInsightsPrompt = ai.definePrompt({
  name: 'dashboardInsightsPrompt',
  input: { schema: DashboardInsightsInputSchema },
  output: { schema: DashboardInsightsOutputSchema },
  prompt: `You are an expert financial analyst for SpeedyPay Marketplace Console, specializing in marketplace payment platforms. Your role is to provide a concise summary of key performance indicators and derive actionable insights from the provided data.

Analyze the following metrics for the SpeedyPay Marketplace Console (all monetary values are in {{{currency 'USD'}} unless specified otherwise):

- Total Gross Volume: {{{totalGrossVolume}}}
- Total Platform Fees Earned: {{{totalPlatformFees}}}
- Total Merchant Net Remittances: {{{totalMerchantNetRemittances}}}
- Pending Settlements: {{{pendingSettlements}}}
- Failed Settlements: {{{failedSettlements}}}
- Active Merchants: {{{activeMerchants}}}
- Recent Transactions Count: {{{recentTransactionsCount}}}
- Recent Settlement Events Count: {{{recentSettlementEventsCount}}}

Provide:
1. A succinct summary of the overall performance, highlighting significant trends or anomalies.
2. A list of 3-5 distinct, actionable insights or recommendations based on the data, focusing on areas for improvement, risk mitigation, or growth opportunities.

Your output should be a JSON object with 'summary' and 'actionableInsights' fields.`,
});

const dashboardInsightsFlow = ai.defineFlow(
  {
    name: 'dashboardInsightsFlow',
    inputSchema: DashboardInsightsInputSchema,
    outputSchema: DashboardInsightsOutputSchema,
  },
  async (input) => {
    const { output } = await dashboardInsightsPrompt(input);
    return output!;
  }
);

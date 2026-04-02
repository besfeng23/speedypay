import type { SpeedyPayTransactionState } from "./speedypay/types";

export type Merchant = {
  id: string;
  businessName: string;
  displayName: string;
  contactName: string;
  email: string;
  mobile: string;
  settlementAccountName: string; // Maps to payout recipient name
  settlementAccountNumberOrWalletId: string; // Maps to procDetail
  settlementChannel: 'Bank Account' | 'Digital Wallet'; // Determines which procId to suggest
  defaultPayoutChannelProcId: string | null; // The specific procId from the channel list
  status: 'Active' | 'Inactive' | 'Suspended';
  onboardingStatus: 'Completed' | 'Pending' | 'In Review' | 'Rejected';
  propertyAssociations: string[];
  defaultFeeType: 'percentage' | 'fixed';
  defaultFeeValue: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type Payment = {
  id: string;
  externalReference: string;
  bookingReferenceOrInvoiceReference: string;
  customerName: string;
  customerEmail: string;
  merchantId: string;
  grossAmount: number;
  currency: string;
  feeType: 'percentage' | 'fixed';
  feeValue: number;
  platformFeeAmount: number;
  merchantNetAmount: number;
  paymentStatus: 'pending' | 'succeeded' | 'failed';
  settlementStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'N/A';
  remittanceStatus: 'pending' | 'sent' | 'failed' | 'N/A' | 'processing';
  sourceChannel: 'Web' | 'Mobile' | 'API';
  createdAt: string;
  updatedAt: string;
};

export type Settlement = {
  id: string;
  paymentId: string;
  merchantId: string;
  grossAmount: number;
  platformFeeAmount: number;
  merchantNetAmount: number; // This is the amount for the payout
  settlementStatus: 'pending' | 'processing' | 'completed' | 'failed';
  remittanceStatus: 'pending' | 'sent' | 'failed' | 'N/A' | 'processing';
  payoutReference: string; // Internal payout ref, maps to orderSeq
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;

  // Provider-specific fields for payout/remittance
  providerName: 'SpeedyPay' | null;
  providerEndpointType: 'cashOut.do' | 'qryOrder.do' | null;
  providerOrderSeq: string | null;
  providerTransSeq: string | null;
  providerRespCode: string | null;
  providerRespMessage: string | null;
  providerTransState: SpeedyPayTransactionState | null;
  providerTimestamp: string | null;
  payoutChannelProcId: string | null;
  payoutChannelDescription: string | null;
  signatureVerified: boolean | null;
  reconciliationStatus: 'pending' | 'reconciled' | 'discrepancy';
  lastQueryAt: string | null;
  rawProviderRequest: string | null; // Store the JSON sent to the provider
  rawProviderResponse: string | null; // Store the JSON received from the provider
};

export type AuditLog = {
  id: string;
  timestamp: string;
  eventType: string;
  user: string;
  details: string;
  entityId: string | null;
  amount?: number | null;
};

export type FeeConfig = {
    id: string;
    name: string;
    type: 'percentage' | 'fixed';
    value: number;
    description: string;
}

export type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
};

export type DashboardStats = {
  totalGrossVolume: number;
  totalPlatformFees: number;
  totalMerchantNetRemittances: number;
  pendingSettlements: number;
  failedSettlements: number;
  activeMerchants: number;
}

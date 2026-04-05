export type Merchant = {
  id: string;
  businessName: string;
  displayName: string;
  contactName: string;
  email: string;
  mobile: string;
  settlementAccountName: string;
  settlementAccountNumberOrWalletId: string;
  defaultPayoutChannel: string; // procId from payout channels
  status: 'Active' | 'Inactive' | 'Suspended';
  onboardingStatus: 'Completed' | 'Pending' | 'In Review' | 'Rejected';
  propertyAssociations: string[];
  defaultFeeType: 'percentage' | 'fixed';
  defaultFeeValue: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ProviderTransState = '00' | '01' | '03' | '04' | '05' | '06' | '07' | '08' | '09';

export type Payment = {
  id: string; // Our internal ID, used as provider's orderSeq
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
  paymentStatus: 'pending' | 'succeeded' | 'failed' | 'expired' | 'processing';
  settlementStatus: 'pending' | 'completed' | 'N/A';
  remittanceStatus: 'pending' | 'processing' | 'sent' | 'failed' | 'N/A';
  sourceChannel: 'Web' | 'Mobile' | 'API' | 'Manual';
  createdAt: string;
  updatedAt: string;
  
  // Provider-specific fields for collection
  providerPaymentUrl?: string;
  providerQrCodePayload?: string;
  providerCollectionRespCode?: string;
  providerCollectionRespMessage?: string;
  providerCollectionSignatureVerified?: boolean;
  providerTransSeq?: string;
  providerTransState?: ProviderTransState;
  providerStateLabel?: string;
  providerCreateTime?: string;
  providerNotifyTime?: string;
  lastQueryAt?: string;
};

export type Settlement = {
  id: string;
  paymentId: string;
  merchantId: string;
  grossAmount: number;
  platformFeeAmount: number;
  merchantNetAmount: number; // This is the payoutAmount for remittance
  settlementStatus: 'pending' | 'completed';
  remittanceStatus: RemittanceStatus;
  
  // Provider-specific fields for remittance
  providerName?: 'SpeedyPay' | string;
  payoutReference: string | null;
  failureReason: string | null;
  providerOrderSeq?: string;
  providerTransSeq?: string;
  providerRespCode?: string;
  providerRespMessage?: string;
  providerTransState?: ProviderTransState;
  providerTransStateLabel?: string;
  signatureVerified?: boolean;
  payoutChannelProcId?: string;
  payoutChannelDescription?: string;
  lastQueryAt?: string;
  providerTimestamp?: string;
  
  createdAt: string;
  updatedAt: string;
};

export type RemittanceStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'N/A';

export type AuditLog = {
  id: string;
  timestamp: string;
  eventType: string;
  user: string;
  details: string;
  entityType: 'merchant' | 'payment' | 'settlement' | 'user' | null;
  entityId: string | null;
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
  activeMerchants: number;
  pendingSettlements: number;
  failedSettlements: number;
  processingPayments: number;
  failedPayments: number;
}

// --- UAT Types ---

export type UATStatus = 'not tested' | 'passed' | 'failed' | 'needs retest';

export type UATLog = {
  id: string;
  timestamp: string;
  testCaseId: string;
  status: 'passed' | 'failed';
  notes: string;
  entityId: string | null;
  entityType: 'payment' | 'settlement' | 'merchant' | null;
  providerResponse?: string;
};

export type UATTestCase = {
    id: string;
    section: 'Collections' | 'Payouts' | 'System & Treasury';
    title: string;
    description: string;
    actionLabel: string;
    requiresInput?: 'latest_payment' | 'latest_settlement' | 'payment_amount';
};

export type UATTestPayload = {
    amount?: number;
    merchantId?: string;
    description?: string;
    entityId?: string;
};

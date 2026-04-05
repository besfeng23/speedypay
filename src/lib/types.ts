// --- Status Enums (Single Source of Truth) ---

export const MERCHANT_STATUSES = ['active', 'inactive', 'suspended'] as const;
export const ONBOARDING_STATUSES = ['completed', 'pending', 'in-review', 'rejected'] as const;
export const PAYMENT_STATUSES = ['pending', 'succeeded', 'failed', 'expired', 'processing'] as const;
export const SETTLEMENT_STATUSES = ['pending', 'completed', 'N/A'] as const;
export const REMITTANCE_STATUSES = ['pending', 'processing', 'sent', 'failed', 'N/A'] as const;
export const PROVIDER_TRANS_STATES = ['00', '01', '03', '04', '05', '06', '07', '08', '09'] as const;

// --- Core Domain Types ---

export type MerchantStatus = (typeof MERCHANT_STATUSES)[number];
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];
export type RemittanceStatus = (typeof REMITTANCE_STATUSES)[number];
export type ProviderTransState = (typeof PROVIDER_TRANS_STATES)[number];


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
  status: MerchantStatus;
  onboardingStatus: OnboardingStatus;
  propertyAssociations: string[];
  defaultFeeType: 'percentage' | 'fixed';
  defaultFeeValue: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};


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
  paymentStatus: PaymentStatus;
  settlementStatus: SettlementStatus;
  remittanceStatus: RemittanceStatus;
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
  currency: string;
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

export type AuditLog = {
  id: string;
  timestamp: string;
  eventType: string;
  user: string;
  details: string;
  entityType: 'merchant' | 'payment' | 'settlement' | 'user' | null;
  entityId: string | null;
  eventIdentifier?: string;
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
  recentTransactionsCount: number;
  recentSettlementEventsCount: number;
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

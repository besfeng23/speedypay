// --- Status Enums (Single Source of Truth) ---

export const MERCHANT_OF_RECORD_TYPES = ['platform', 'client_merchant', 'submerchant'] as const;
export const PROVIDER_MERCHANT_MODES = ['master_only', 'master_with_submerchants', 'direct_merchant'] as const;
export const SETTLEMENT_MODES = ['internal_payout', 'provider_direct_settlement', 'split_settlement'] as const;
export const SETTLEMENT_SCHEDULES = ['instant', 't1', 'manual', 'batched'] as const;
export const PROVIDER_ONBOARDING_STATUSES = ['not_started', 'pending', 'approved', 'rejected'] as const;

export const MERCHANT_STATUSES = ['active', 'inactive', 'suspended'] as const;
export const ONBOARDING_STATUSES = ['completed', 'pending', 'in-review', 'rejected'] as const;
export const KYC_STATUSES = ['not_started', 'pending', 'in_review', 'approved', 'rejected'] as const;
export const RISK_STATUSES = ['not_assessed', 'low', 'medium', 'high'] as const;
export const ACTIVATION_STATUSES = ['active', 'inactive', 'restricted'] as const;

export const ONBOARDING_CASE_STATUSES = ['open', 'in_progress', 'awaiting_documents', 'in_review', 'approved', 'rejected', 'closed'] as const;
export const ONBOARDING_TYPES = ['merchant', 'beneficiary', 'submerchant'] as const;
export const DOCUMENT_STATUSES = ['pending', 'uploaded', 'in_review', 'approved', 'rejected', 'expired'] as const;
export const DOCUMENT_TYPES = ['business_registration', 'proof_of_address', 'owner_id', 'bank_statement'] as const;
export const CHECK_STATUSES = ['pending', 'passed', 'failed', 'warning'] as const;
export const CHECK_TYPES = ['sanctions_screening', 'credit_check', 'business_verification'] as const;

export const MERCHANT_SETTLEMENT_STATUSES = ['active', 'paused', 'banned'] as const;

export const PAYMENT_STATUSES = ['pending', 'succeeded', 'failed', 'expired', 'processing'] as const;
export const SETTLEMENT_STATUSES = ['pending', 'eligible', 'unpaid', 'processing', 'paid', 'failed', 'reversed'] as const;
export const PAYOUT_STATUSES = ['pending', 'processing', 'sent', 'failed'] as const;


export const PROVIDER_TRANS_STATES = ['00', '01', '03', '04', '05', '06', '07', '08', '09'] as const;
export const TENANT_STATUSES = ['active', 'inactive'] as const;

export const ENTITY_TYPES = ['speedypay', 'platform', 'tenant', 'merchant', 'beneficiary'] as const;
export const DESTINATION_TYPES = ['bank', 'wallet', 'internal'] as const;
export const FEE_TYPES = ['percentage', 'flat', 'blended'] as const;
export const VERIFICATION_STATUSES = ['unverified', 'pending', 'verified', 'failed'] as const;
export const ALLOCATION_TYPES = ['processing_fee', 'platform_fee', 'tenant_fee', 'merchant_net', 'reserve'] as const;

export const LEDGER_TRANSACTION_TYPES = ['payment_capture', 'fee_allocation', 'settlement_payable', 'payout_release', 'refund', 'reversal', 'adjustment'] as const;
export const LEDGER_ENTRY_TYPES = ['debit', 'credit'] as const;
export const LEDGER_TRANSACTION_STATUSES = ['pending', 'completed', 'failed'] as const;
export const ACCOUNT_CODES = [
    'customer_clearing',
    'processor_fee_revenue',
    'platform_fee_revenue',
    'tenant_fee_revenue',
    'merchant_settlement_payable',
    'reserve_payable',
    'payout_clearing',
    'refund_clearing',
] as const;

export const ROLES = ['super_admin', 'speedypay_ops', 'platform_admin', 'tenant_admin', 'finance_ops', 'compliance_ops', 'read_only_auditor'] as const;
export type Role = (typeof ROLES)[number];


// --- Core Domain Types ---
export type MerchantOfRecordType = (typeof MERCHANT_OF_RECORD_TYPES)[number];
export type ProviderMerchantMode = (typeof PROVIDER_MERCHANT_MODES)[number];
export type SettlementMode = (typeof SETTLEMENT_MODES)[number];
export type SettlementSchedule = (typeof SETTLEMENT_SCHEDULES)[number];
export type ProviderOnboardingStatus = (typeof PROVIDER_ONBOARDING_STATUSES)[number];

export type MerchantStatus = (typeof MERCHANT_STATUSES)[number];
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];
export type KYStatus = (typeof KYC_STATUSES)[number];
export type RiskStatus = (typeof RISK_STATUSES)[number];
export type ActivationStatus = (typeof ACTIVATION_STATUSES)[number];

export type OnboardingCaseStatus = (typeof ONBOARDING_CASE_STATUSES)[number];
export type OnboardingType = (typeof ONBOARDING_TYPES)[number];
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export type CheckStatus = (typeof CHECK_STATUSES)[number];
export type CheckType = (typeof CHECK_TYPES)[number];

export type MerchantSettlementStatus = (typeof MERCHANT_SETTLEMENT_STATUSES)[number];

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type InternalSettlementStatus = (typeof SETTLEMENT_STATUSES)[number];
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];
export type ProviderTransState = (typeof PROVIDER_TRANS_STATES)[number];
export type TenantStatus = (typeof TENANT_STATUSES)[number];

export type EntityType = (typeof ENTITY_TYPES)[number];
export type DestinationType = (typeof DESTINATION_TYPES)[number];
export type FeeType = (typeof FEE_TYPES)[number];
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
export type AllocationType = (typeof ALLOCATION_TYPES)[number];

export type LedgerTransactionType = (typeof LEDGER_TRANSACTION_TYPES)[number];
export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];
export type LedgerTransactionStatus = (typeof LEDGER_TRANSACTION_STATUSES)[number];
export type AccountCode = (typeof ACCOUNT_CODES)[number];


// --- Base Models (reflecting DB tables) ---

export type Entity = {
  id: string;
  legalName: string;
  displayName: string;
  entityType: EntityType;
  parentEntityId: string | null;
  status: 'active' | 'inactive' | 'restricted';
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

export type TenantRecord = {
  id: string; // Internal UUID
  entityId: string; // Foreign key to Entity table
  tenantCode: string; // Short, unique code e.g., "COLLO"
  status: TenantStatus;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

export type MerchantAccount = {
  id: string; // Internal UUID
  entityId: string; // Foreign key to Entity table
  tenantId: string; // Foreign key to Tenant table
  onboardingStatus: OnboardingStatus;
  kycStatus: KYStatus;
  riskStatus: RiskStatus;
  activationStatus: ActivationStatus;
  settlementStatus: MerchantSettlementStatus;
  defaultSettlementDestinationId: string | null;
  
  // New production-ready fields
  merchantOfRecordType: MerchantOfRecordType;
  providerMerchantMode: ProviderMerchantMode;
  providerMerchantId: string | null;
  providerSubMerchantId: string | null;
  isProviderOnboarded: boolean;
  providerOnboardingStatus: ProviderOnboardingStatus;
  settlementMode: SettlementMode;
  settlementSchedule: SettlementSchedule;
  providerCapabilityProfile: Record<string, any>;

  createdAt: string;
  updatedAt: string;
};

export type SettlementDestination = {
  id: string; // Internal UUID
  merchantAccountId: string; // The merchant account this destination belongs to
  destinationType: DestinationType;
  accountName: string;
  accountNumberMasked: string;
  bankCode: string; // Corresponds to provider's procId
  providerReference: string | null;
  verificationStatus: VerificationStatus;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AllocationRule = {
    id: string; // Internal UUID
    tenantId: string | null;
    merchantAccountId: string | null;
    paymentMethod: string; // e.g., 'card', 'bank_transfer', 'all'
    ruleType: AllocationType;
    percentageValue: number | null;
    flatValue: number | null;
    recipientEntityId: string; // The entity that receives this allocation
    priority: number; // For resolving which rule to apply first
    active: boolean;
    createdAt: string;
    updatedAt: string;
};

export type PaymentAllocation = {
  id: string;
  paymentId: string;
  allocationType: AllocationType;
  recipientEntityId: string;
  basisType: 'flat' | 'percentage' | 'rule';
  amount: number;
  currency: string;
  ruleReference: string | null; // ID of the AllocationRule that generated this
  createdAt: string;
};

export type LedgerTransaction = {
    id: string;
    paymentId: string | null;
    payoutId: string | null;
    transactionType: LedgerTransactionType;
    status: LedgerTransactionStatus;
    reference: string | null;
    createdAt: string;
    updatedAt: string;
};

export type LedgerEntry = {
    id: string;
    ledgerTransactionId: string;
    entityId: string;
    accountCode: AccountCode;
    entryType: LedgerEntryType;
    amount: number;
    currency: string;
    description: string;
    createdAt: string;
};


// --- Composite Types (for UI and business logic) ---

export type Tenant = TenantRecord & {
  name: string;
  notes: string;
  platformFeeType: 'percentage' | 'fixed';
  platformFeeValue: number;
  entity: Entity;
};

export type Merchant = MerchantAccount & {
  businessName: string,
  displayName: string,
  contactName: string,
  email: string,
  mobile: string,
  notes?: string,
  status: 'active' | 'inactive' | 'suspended';
  defaultFeeType: 'percentage' | 'fixed',
  defaultFeeValue: number,
  settlementAccountName: string;
  settlementAccountNumberOrWalletId: string;
  defaultPayoutChannel: string;
  entity: Entity;
  tenant: Tenant;
  defaultSettlementDestination: SettlementDestination | null;
  propertyAssociations: string[];
};


// --- Transactional Types ---

export type Payment = {
  id: string; // Our internal ID, used as provider's orderSeq
  tenantId: string;
  merchantId: string; // This now refers to the MerchantAccount ID
  externalReference: string;
  bookingReferenceOrInvoiceReference: string;
  customerName: string;
  customerEmail: string;
  grossAmount: number;
  currency: string;
  platformFeeAmount: number; // Stored for quick reference
  merchantNetAmount: number; // Stored for quick reference
  paymentStatus: PaymentStatus;
  settlementStatus: 'pending' | 'completed' | 'N/A'; // Simplified status
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

export type Payout = {
    id: string;
    settlementId: string;
    merchantAccountId: string;
    settlementDestinationId: string;
    amount: number;
    currency: string;
    status: PayoutStatus;

    // Provider-specific fields
    providerName?: 'SpeedyPay' | string;
    providerTransSeq?: string;
    providerRespCode?: string;
    providerRespMessage?: string;
    providerTransState?: ProviderTransState;
    providerTransStateLabel?: string;
    signatureVerified?: boolean;
    payoutChannelProcId?: string;
    payoutChannelDescription?: string;
    providerTimestamp?: string;
    lastQueryAt?: string;
    failureReason?: string | null;

    createdAt: string;
    updatedAt: string;
};

export type Settlement = {
  id: string;
  tenantId: string;
  paymentId: string;
  merchantId: string;
  status: InternalSettlementStatus; // 'unpaid', 'processing', 'paid', 'failed'
  
  grossAmount: number;
  currency: string;
  platformFeeAmount: number;
  merchantNetAmount: number; // The amount that is payable
  
  payoutId: string | null;

  // New settlement lifecycle fields
  settlementMode: SettlementMode;
  settlementSchedule: SettlementSchedule;
  providerSettlementReference: string | null;
  eligibilityAt: string | null;
  remittedAt: string | null;
  failedAt: string | null;
  reversalReference: string | null;
  failureReason: string | null;
  
  createdAt: string;
  updatedAt: string;

  // This is a hydrated property, not in DB
  payout?: Payout | null;
};


// --- Onboarding & Compliance ---

export type OnboardingCase = {
  id: string;
  entityId: string; // The entity being onboarded (e.g., a merchant entity)
  tenantId: string | null;
  onboardingType: OnboardingType;
  status: OnboardingCaseStatus;
  assignedTo: string | null; // User ID of the compliance officer
  createdAt: string;
  updatedAt: string;
};

export type ComplianceDocument = {
  id: string;
  onboardingCaseId: string;
  documentType: DocumentType;
  fileReference: string; // e.g., a path to a file in cloud storage
  status: DocumentStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ComplianceCheck = {
  id: string;
  onboardingCaseId: string;
  checkType: CheckType;
  checkStatus: CheckStatus;
  resultSummary: string; // A human-readable summary of the check result
  rawReference: string | null; // e.g., an ID from an external verification service
  createdAt: string;
  updatedAt: string;
};


// --- Utility & System Types ---

export type AuditLog = {
  id: string;
  timestamp: string;
  eventType: string;
  user: string;
  details: string;
  entityType: 'merchant' | 'payment' | 'settlement' | 'payout' | 'user' | 'tenant' | 'entity' | null;
  entityId: string | null;
  eventIdentifier?: string;
  source?: 'admin' | 'system' | 'webhook' | 'provider' | 'auth';
  action?: string;
  previousState?: string | null;
  newState?: string | null;
  outcome?: 'success' | 'failed' | 'duplicate' | 'denied' | 'in-progress';
  correlationId?: string | null;
};

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
  entityType: 'payment' | 'settlement' | 'merchant' | 'payout' | null;
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

    
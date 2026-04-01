export type Merchant = {
  id: string;
  businessName: string;
  displayName: string;
  contactName: string;
  email: string;
  mobile: string;
  settlementAccountName: string;
  settlementAccountNumberOrWalletId: string;
  settlementChannel: 'Bank Account' | 'Digital Wallet';
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
  remittanceStatus: 'pending' | 'sent' | 'failed' | 'N/A';
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
  merchantNetAmount: number;
  settlementStatus: 'pending' | 'processing' | 'completed' | 'failed';
  remittanceStatus: 'pending' | 'sent' | 'failed';
  payoutReference: string;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuditLog = {
  id: string;
  timestamp: string;
  eventType: string;
  user: string;
  details: string;
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

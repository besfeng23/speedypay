import { z } from 'zod';

export const OnboardingStatusSchema = z.enum(["Completed", "Pending", "In Review", "Rejected"]);
export const MerchantStatusSchema = z.enum(["Active", "Inactive", "Suspended"]);
export const FeeTypeSchema = z.enum(['percentage', 'fixed']);
export const SettlementChannelSchema = z.enum(["Bank Account", "Digital Wallet"]);

export const MerchantSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  contactName: z.string().min(2, "Contact name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  mobile: z.string().min(5, "Please enter a valid mobile number"),
  
  settlementChannel: SettlementChannelSchema,
  settlementAccountName: z.string().min(2, "Account name is required"),
  settlementAccountNumberOrWalletId: z.string().min(5, "A valid account number or wallet ID is required"),
  defaultPayoutChannelProcId: z.string().min(1, "A default payout channel is required."),

  onboardingStatus: OnboardingStatusSchema,
  
  defaultFeeType: FeeTypeSchema,
  defaultFeeValue: z.coerce
    .number({ invalid_type_error: "Fee value must be a number" })
    .positive("Fee value must be positive")
    .min(0.01, "Fee value is too low"),

  notes: z.string().optional(),
});

export type MerchantFormValues = z.infer<typeof MerchantSchema>;


const PaymentStatusSchema = z.enum(['pending', 'succeeded', 'failed']);
const SettlementStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed', 'N/A']);
const RemittanceStatusSchema = z.enum(['pending', 'sent', 'failed', 'N/A', 'processing']);
const SourceChannelSchema = z.enum(['Web', 'Mobile', 'API']);

export const PaymentSchema = z.object({
    id: z.string(),
    externalReference: z.string(),
    bookingReferenceOrInvoiceReference: z.string(),
    customerName: z.string(),
    customerEmail: z.string().email(),
    merchantId: z.string(),
    grossAmount: z.number(),
    currency: z.string().length(3),
    feeType: FeeTypeSchema,
    feeValue: z.number(),
    platformFeeAmount: z.number(),
    merchantNetAmount: z.number(),
    paymentStatus: PaymentStatusSchema,
    settlementStatus: SettlementStatusSchema,
    remittanceStatus: RemittanceStatusSchema,
    sourceChannel: SourceChannelSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const SettlementSchema = z.object({
    id: z.string(),
    paymentId: z.string(),
    merchantId: z.string(),
    grossAmount: z.number(),
    platformFeeAmount: z.number(),
    merchantNetAmount: z.number(),
    settlementStatus: z.enum(['pending', 'processing', 'completed', 'failed']),
    remittanceStatus: RemittanceStatusSchema,
    payoutReference: z.string(),
    failureReason: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

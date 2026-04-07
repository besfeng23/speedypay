import { z } from 'zod';
import { payoutChannels } from './speedypay/payout-channels';
import { ONBOARDING_STATUSES, MERCHANT_OF_RECORD_TYPES, PROVIDER_MERCHANT_MODES, SETTLEMENT_MODES, SETTLEMENT_SCHEDULES } from './types';

const validProcIds = payoutChannels.map(c => c.procId);

export const FeeTypeSchema = z.enum(['percentage', 'fixed']);

export const TenantSchema = z.object({
  name: z.string().min(2, "Tenant name must be at least 2 characters"),
  platformFeeType: FeeTypeSchema,
  platformFeeValue: z.coerce.number().min(0, "Fee value cannot be negative"),
  notes: z.string().optional(),
});
export type TenantFormValues = z.infer<typeof TenantSchema>;

export const MerchantSchema = z.object({
  tenantId: z.string().min(1, "A tenant must be selected."),
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  contactName: z.string().min(2, "Contact name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  mobile: z.string().min(5, "Please enter a valid mobile number"),
  
  defaultPayoutChannel: z.string().refine(val => validProcIds.includes(val), {
    message: "Invalid payout channel selected.",
  }),
  settlementAccountName: z.string().min(2, "Account name is required"),
  settlementAccountNumberOrWalletId: z.string().min(5, "A valid account number or wallet ID is required"),

  onboardingStatus: z.enum(ONBOARDING_STATUSES),
  
  defaultFeeType: FeeTypeSchema,
  defaultFeeValue: z.coerce
    .number({ invalid_type_error: "Fee value must be a number" })
    .positive("Fee value must be positive")
    .min(0.01, "Fee value is too low"),

  // New production-ready fields
  merchantOfRecordType: z.enum(MERCHANT_OF_RECORD_TYPES),
  providerMerchantMode: z.enum(PROVIDER_MERCHANT_MODES),
  settlementMode: z.enum(SETTLEMENT_MODES),
  settlementSchedule: z.enum(SETTLEMENT_SCHEDULES),

  notes: z.string().optional(),
});

export type MerchantFormValues = z.infer<typeof MerchantSchema>;

export const CreatePaymentSchema = z.object({
  merchantId: z.string().min(1, "Please select a merchant."),
  amount: z.coerce.number().positive("Amount must be a positive number.").min(1, "Amount must be at least 1."),
  description: z.string().min(3, "Description must be at least 3 characters long.").max(100, "Description is too long."),
});

export type CreatePaymentFormValues = z.infer<typeof CreatePaymentSchema>;

    
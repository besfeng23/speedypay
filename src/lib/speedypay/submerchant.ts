/**
 * @fileoverview Service abstraction for managing sub-merchants on the payment provider's platform.
 * This file contains stubbed functions that represent the actions needed to onboard and manage
 * merchants who are treated as separate entities by the payment provider.
 *
 * NOTE: These are STUB implementations. A real implementation would involve API calls
 * to the provider's sub-merchant management endpoints.
 */
'use server';

import type { Merchant } from '../types';

interface SubMerchantRegistrationPayload {
    merchant: Merchant;
    legalName: string;
    businessAddress: string;
    // ... other provider-required fields
}

interface ProviderSubMerchant {
    id: string; // The provider's ID for this sub-merchant
    status: 'pending' | 'active' | 'rejected';
    // ... other provider-specific fields
}

/**
 * Registers a new sub-merchant with the payment provider.
 * This would be called when a merchant's `providerMerchantMode` is set to `master_with_submerchants`.
 * @param payload - The data required by the provider for sub-merchant registration.
 * @returns A promise that resolves to the provider's representation of the sub-merchant.
 */
export async function registerSubMerchant(payload: SubMerchantRegistrationPayload): Promise<ProviderSubMerchant> {
    console.log('[SubMerchant Service STUB] Registering sub-merchant:', payload.merchant.displayName);
    
    // STUB: In a real implementation, this would make an API call to the provider.
    // We simulate a successful registration and return a mock provider ID.
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
        id: `prov-sm-${Math.random().toString(36).substring(2, 10)}`,
        status: 'pending', // Provider status would likely start as pending
    };
}

/**
 * Updates an existing sub-merchant's details on the provider's platform.
 * @param providerSubMerchantId - The provider's unique ID for the sub-merchant.
 * @param payload - The data to update.
 * @returns A promise that resolves to the updated provider sub-merchant object.
 */
export async function updateSubMerchant(providerSubMerchantId: string, payload: Partial<SubMerchantRegistrationPayload>): Promise<ProviderSubMerchant> {
    console.log(`[SubMerchant Service STUB] Updating sub-merchant: ${providerSubMerchantId}`);
    
    // STUB: API call to update details.
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
        id: providerSubMerchantId,
        status: 'pending',
    };
}

/**
 * Retrieves the current status of a sub-merchant from the provider.
 * This is crucial for syncing our internal state with the provider's.
 * @param providerSubMerchantId - The provider's unique ID for the sub-merchant.
 * @returns A promise that resolves to the provider sub-merchant object.
 */
export async function getSubMerchantStatus(providerSubMerchantId: string): Promise<ProviderSubMerchant> {
    console.log(`[SubMerchant Service STUB] Getting status for sub-merchant: ${providerSubMerchantId}`);
    
    // STUB: API call to query status.
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simulate a possible status change from pending to active.
    const isApproved = Math.random() > 0.5;

    return {
        id: providerSubMerchantId,
        status: isApproved ? 'active' : 'pending',
    };
}

/**
 * Verifies a settlement account directly with the provider for a sub-merchant.
 * Some providers require this step before direct settlements are enabled.
 * @param providerSubMerchantId - The provider's ID for the sub-merchant.
 * @param settlementDetails - The bank account or wallet details to verify.
 * @returns A promise that resolves to a boolean indicating verification success.
 */
export async function verifySubMerchantSettlementAccount(providerSubMerchantId: string, settlementDetails: any): Promise<boolean> {
    console.log(`[SubMerchant Service STUB] Verifying settlement account for: ${providerSubMerchantId}`);

    // STUB: API call for account verification.
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate a successful verification.
    return true;
}

    
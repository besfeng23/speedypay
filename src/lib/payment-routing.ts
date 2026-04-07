'use server';

import type { Merchant, Tenant } from "./types";

interface CollectionRouteContext {
    merchant: Merchant;
    tenant: Tenant;
    amount: number;
    paymentMethod?: string;
}

type CollectionRouteDecision = {
    collectionModel: 'master_merchant' | 'sub_merchant' | 'direct_merchant';
    settlementModel: 'internal_payout' | 'provider_direct_settlement' | 'split_settlement';
    requiresProviderReference: boolean;
    providerMerchantId: string | null;
    notes: string[];
};

/**
 * The Payment Routing Engine.
 * This function is the central decision-maker for how a payment should be processed.
 * It determines the collection method and settlement path based on merchant configuration,
 * tenant settings, and provider capabilities.
 *
 * @param context - The context of the payment intent.
 * @returns A CollectionRouteDecision object detailing the chosen processing path.
 */
export async function resolveCollectionRoute(context: CollectionRouteContext): Promise<CollectionRouteDecision> {
    const { merchant } = context;
    const notes: string[] = [];

    let collectionModel: CollectionRouteDecision['collectionModel'] = 'master_merchant';
    let settlementModel: CollectionRouteDecision['settlementModel'] = 'internal_payout';

    // --- Decision Logic ---
    // This is where the complex rules for routing will go.
    // For now, we will implement a safe fallback.
    
    // Abstracted Logic Example:
    // if (merchant.providerMerchantMode === 'direct_merchant' && merchant.isProviderOnboarded) {
    //   collectionModel = 'direct_merchant';
    //   settlementModel = 'provider_direct_settlement';
    //   notes.push("Merchant is a direct entity on the provider. Using direct collection and settlement.");
    // } else if (merchant.providerMerchantMode === 'master_with_submerchants' && merchant.providerSubMerchantId) {
    //   collectionModel = 'sub_merchant';
    //   settlementModel = merchant.settlementMode; // e.g., 'split_settlement'
    //   notes.push(`Using master account to collect for sub-merchant ID: ${merchant.providerSubMerchantId}.`);
    // } else {
    //   collectionModel = 'master_merchant';
    //   settlementModel = 'internal_payout';
    //   notes.push("Defaulting to master merchant collection and internal payout settlement.");
    // }

    // CURRENT IMPLEMENTATION: Safe Fallback
    notes.push("Provider sub-merchant and direct settlement capabilities are pending confirmation. Defaulting to master merchant collection with internal payout settlement.");
    
    return {
        collectionModel,
        settlementModel,
        requiresProviderReference: collectionModel !== 'master_merchant' && !!merchant.providerMerchantId,
        providerMerchantId: collectionModel === 'master_merchant' ? null : merchant.providerMerchantId,
        notes,
    };
}

    
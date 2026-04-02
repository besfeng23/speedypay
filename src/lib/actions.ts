'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { format, formatISO } from 'date-fns';
import { MerchantSchema, type MerchantFormValues } from './schemas';
import { merchants, addAuditLog, getSettlementById, getMerchantById, updateSettlement } from './data';
import type { Merchant, Settlement } from './types';
import { createPayout, queryOrder, queryBalance } from './speedypay/api';
import { payoutChannelMap } from './speedypay/payout-channels';
import { verifySignature } from './speedypay/crypto';
import { speedypayConfig } from './speedypay/config';

interface ActionResult {
  success: boolean;
  message?: string;
  data?: any;
}

export async function createMerchant(values: MerchantFormValues): Promise<ActionResult> {
  try {
    const validatedData = MerchantSchema.parse(values);

    const now = formatISO(new Date());
    const newMerchant: Merchant = {
      id: `mer-${uuidv4().slice(0, 8)}`,
      status: 'Active',
      propertyAssociations: [],
      createdAt: now,
      updatedAt: now,
      ...validatedData,
    };
    
    merchants.unshift(newMerchant);

    await addAuditLog({
      eventType: 'merchant.created',
      user: 'admin@speedypay.com',
      details: `Created new merchant: ${newMerchant.displayName} (ID: ${newMerchant.id})`,
      entityId: newMerchant.id,
    });

    revalidatePath('/merchants');
    revalidatePath('/dashboard');

    return { success: true };

  } catch (error) {
    console.error('Failed to create merchant:', error);
    let message = 'An unknown error occurred.';
    if (error instanceof z.ZodError) {
      message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    } else if (error instanceof Error) {
        message = error.message;
    }
    return { success: false, message };
  }
}

/**
 * Initiates a remittance (payout) for a given settlement.
 * This is an idempotent action. If a payout has already been initiated, it will not proceed.
 * @param settlementId The ID of the settlement to process.
 */
export async function initiateRemittance(settlementId: string): Promise<ActionResult> {
    const settlement = await getSettlementById(settlementId);
    if (!settlement) {
        return { success: false, message: 'Settlement not found.' };
    }
    if (settlement.providerOrderSeq) {
        return { success: false, message: 'Payout already initiated for this settlement.' };
    }
    if (settlement.settlementStatus !== 'pending') {
        return { success: false, message: `Settlement status is '${settlement.settlementStatus}', cannot initiate payout.` };
    }

    const merchant = await getMerchantById(settlement.merchantId);
    if (!merchant) {
        return { success: false, message: 'Merchant not found for this settlement.' };
    }
    if (!merchant.defaultPayoutChannelProcId) {
        return { success: false, message: 'Merchant has no default payout channel configured.' };
    }

    const orderSeq = `payout-${settlement.id}-${Date.now()}`;
    const payoutChannel = payoutChannelMap.get(merchant.defaultPayoutChannelProcId);

    try {
        await updateSettlement(settlement.id, { remittanceStatus: 'processing' });
        await addAuditLog({
            eventType: 'remittance.initiated',
            user: 'admin@speedypay.com',
            details: `Initiating payout for ${settlement.merchantNetAmount} to merchant ${merchant.displayName}. OrderSeq: ${orderSeq}`,
            entityId: settlement.id,
        });

        const requestPayload = {
            orderSeq,
            orderDate: format(new Date(), 'yyyyMMdd'),
            amount: settlement.merchantNetAmount.toFixed(2),
            fee: "0.00",
            currency: 'PHP' as const,
            procId: merchant.defaultPayoutChannelProcId,
            procDetail: merchant.settlementAccountNumberOrWalletId,
            email: merchant.email,
            notifyUrl: speedypayConfig.notifyUrl || 'https://console.speedypay.app/api/webhooks/speedypay',
            mobilePhone: merchant.mobile,
            purposes: `Settlement for payment ${settlement.paymentId}`,
            remark: `Settlement ID: ${settlement.id}`,
            firstName: merchant.settlementAccountName.split(' ')[0],
            lastName: merchant.settlementAccountName.split(' ').slice(1).join(' ') || 'N/A',
            country: 'PH'
        };

        const response = await createPayout(requestPayload);
        const signatureVerified = verifySignature(response, response.sign);

        const settlementUpdates: Partial<Settlement> = {
            providerName: 'SpeedyPay',
            providerEndpointType: 'cashOut.do',
            providerOrderSeq: response.orderSeq,
            providerTransSeq: response.transSeq,
            providerRespCode: response.respCode,
            providerRespMessage: response.respMessage,
            providerTransState: response.transState,
            providerTimestamp: response.timestamp,
            payoutChannelProcId: requestPayload.procId,
            payoutChannelDescription: payoutChannel?.description || 'Unknown',
            signatureVerified,
            rawProviderRequest: JSON.stringify(requestPayload),
            rawProviderResponse: JSON.stringify(response),
            reconciliationStatus: 'pending',
            remittanceStatus: response.respCode === '00000000' ? 'processing' : 'failed',
            failureReason: response.respCode !== '00000000' ? response.respMessage : null,
        };

        await updateSettlement(settlement.id, settlementUpdates);

        if (response.respCode !== '00000000' || !signatureVerified) {
             throw new Error(`Payout provider rejected request or signature invalid. Message: ${response.respMessage}`);
        }

        await addAuditLog({
            eventType: 'remittance.provider.response',
            user: 'System',
            details: `Provider accepted payout request. TransState: ${response.transState}. Signature Verified: ${signatureVerified}.`,
            entityId: settlement.id,
        });

        revalidatePath(`/settlements/${settlementId}`);
        return { success: true, message: 'Payout initiated successfully.' };

    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        await updateSettlement(settlement.id, { remittanceStatus: 'failed', failureReason: message });
        await addAuditLog({
            eventType: 'remittance.failed',
            user: 'System',
            details: `Payout initiation failed: ${message}`,
            entityId: settlement.id,
        });
        revalidatePath(`/settlements/${settlementId}`);
        return { success: false, message };
    }
}

export async function querySettlementStatus(settlementId: string): Promise<ActionResult> {
    const settlement = await getSettlementById(settlementId);
    if (!settlement || !settlement.providerOrderSeq) {
        return { success: false, message: 'Settlement has not been sent to provider yet.' };
    }
    
    try {
        await addAuditLog({
            eventType: 'remittance.query.sent',
            user: 'admin@speedypay.com',
            details: `Manually querying status for orderSeq ${settlement.providerOrderSeq}.`,
            entityId: settlement.id,
        });

        const response = await queryOrder(settlement.providerOrderSeq);
        const signatureVerified = verifySignature(response, response.sign);

        const settlementUpdates: Partial<Settlement> = {
            providerRespCode: response.respCode,
            providerRespMessage: response.respMessage,
            providerTransState: response.transState,
            providerTransSeq: response.transSeq,
            providerTimestamp: response.timestamp,
            signatureVerified,
            lastQueryAt: formatISO(new Date()),
            rawProviderResponse: JSON.stringify(response),
        };

        if (response.respCode === '00000000' && signatureVerified) {
             if (response.transState === '00') { // Succeeded
                settlementUpdates.remittanceStatus = 'sent';
                settlementUpdates.settlementStatus = 'completed';
                settlementUpdates.reconciliationStatus = 'reconciled';
             } else if (response.transState === '01') { // Failed
                settlementUpdates.remittanceStatus = 'failed';
                settlementUpdates.failureReason = response.respMessage || 'Query reported failure';
                settlementUpdates.reconciliationStatus = 'reconciled';
             }
        }
        
        await updateSettlement(settlement.id, settlementUpdates);
        
        await addAuditLog({
            eventType: 'remittance.query.response',
            user: 'System',
            details: `Received status from provider. TransState: ${response.transState}. Signature Verified: ${signatureVerified}.`,
            entityId: settlement.id,
        });

        revalidatePath(`/settlements/${settlementId}`);
        return { success: true, message: `Status updated to: ${response.transState}` };

    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
         await addAuditLog({
            eventType: 'remittance.query.failed',
            user: 'System',
            details: `Failed to query status: ${message}`,
            entityId: settlement.id,
        });
        revalidatePath(`/settlements/${settlementId}`);
        return { success: false, message };
    }
}

export async function getProviderBalance(): Promise<ActionResult> {
    if (!isSpeedyPayConfigured()) {
        return { success: false, message: 'Provider not configured.' };
    }
    try {
        const response = await queryBalance();
        const signatureVerified = verifySignature(response, response.sign);

        if (response.respCode !== '00000000' || !signatureVerified) {
            throw new Error(`Provider returned an error or signature mismatch: ${response.respMessage}`);
        }
        
        return { success: true, data: { balance: response.amount, currency: 'PHP' } };

    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, message };
    }
}

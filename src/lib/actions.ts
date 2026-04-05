'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { format, formatISO, parseISO } from 'date-fns';
import { MerchantSchema, CreatePaymentSchema, type MerchantFormValues, type CreatePaymentFormValues } from './schemas';
import { merchants, addAuditLog, payments, settlements, updatePayment, addUATLog } from './data';
import type { Merchant, Settlement, Payment, UATTestPayload } from './types';
import { updateSettlement as dbUpdateSettlement, getSettlementById, getMerchantById, getPaymentById } from './data';
import { cashOut, qryOrder, qryBalance, createCollectionPayment as apiCreateCollectionPayment, qryCollectionOrder, qryCollectionBalance } from './speedypay/api';
import { mapProviderStateToInternal, providerStateLabels, mapCollectionStateToPaymentStatus } from './speedypay/mappers';
import { payoutChannelMap } from './speedypay/payout-channels';
import { speedypayConfig } from './speedypay/config';
import { verifySignature } from './speedypay/crypto';


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
    
    // In a real app, you would save this to your database.
    merchants.unshift(newMerchant);

    await addAuditLog({
      eventType: 'merchant.created',
      user: 'admin@speedypay.com', // In a real app, get this from the session
      details: `Created new merchant: ${newMerchant.displayName} (ID: ${newMerchant.id})`,
      entityId: newMerchant.id,
      entityType: 'merchant'
    });

    // Revalidate paths to update the UI
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

export async function createCollectionPayment(values: CreatePaymentFormValues): Promise<ActionResult> {
  try {
    const validatedData = CreatePaymentSchema.parse(values);
    const { amount, merchantId, description } = validatedData;
    
    const merchant = await getMerchantById(merchantId);
    if (!merchant) {
      return { success: false, message: 'Merchant not found.' };
    }

    // Server-side fee calculation and validation
    const platformFeeAmount = merchant.defaultFeeType === 'percentage' 
      ? amount * (merchant.defaultFeeValue / 100) 
      : merchant.defaultFeeValue;
    const merchantNetAmount = amount - platformFeeAmount;
    
    if (merchantNetAmount < 0) {
      return { success: false, message: 'Error: Fee configuration results in a negative net amount for the merchant. Please adjust merchant fees.' };
    }

    const orderSeq = `pay-${uuidv4()}`;
    const now = new Date();

    // 1. Create internal payment record first
    const newPayment: Payment = {
        id: orderSeq,
        externalReference: 'N/A',
        bookingReferenceOrInvoiceReference: description,
        customerName: 'N/A (Generated Link)',
        customerEmail: 'N/A',
        merchantId: merchantId,
        grossAmount: amount,
        currency: 'PHP',
        feeType: merchant.defaultFeeType,
        feeValue: merchant.defaultFeeValue,
        platformFeeAmount,
        merchantNetAmount,
        paymentStatus: 'pending',
        settlementStatus: 'pending',
        remittanceStatus: 'pending',
        sourceChannel: 'Manual',
        createdAt: formatISO(now),
        updatedAt: formatISO(now),
    };
    payments.unshift(newPayment);
    await addAuditLog({ eventType: 'payment.created', user: 'admin@speedypay.com', details: `Created manual payment link for ${merchant.displayName}`, entityId: orderSeq, entityType: 'payment' });


    // 2. Call provider API
    const response = await apiCreateCollectionPayment({
        orderSeq: orderSeq,
        amount: amount,
        busiName: merchant.displayName,
        dueTime: 60, // 60 minutes
        remark: description
    });
    
    // 3. Verify provider response signature (already done in API layer)
    const isSignatureVerified = verifySignature(response, speedypayConfig.secretKey!);

    // 4. Update internal record with provider response
    const updatedPaymentData: Partial<Payment> = {
        providerPaymentUrl: response.url,
        providerCollectionRespCode: response.respCode,
        providerCollectionRespMessage: response.respMessage,
        providerCollectionSignatureVerified: isSignatureVerified,
    }

    if (response.respCode !== '00000000') {
      updatedPaymentData.paymentStatus = 'failed';
      await updatePayment(orderSeq, updatedPaymentData);
      throw new Error(response.respMessage || 'Failed to create payment link at provider.');
    }

    await updatePayment(orderSeq, updatedPaymentData);
     await addAuditLog({ eventType: 'payment.provider.sent', user: 'System', details: `Sent request to provider. URL: ${response.url}`, entityId: orderSeq, entityType: 'payment' });

    revalidatePath('/transactions');
    revalidatePath(`/transactions/${orderSeq}`);
    revalidatePath('/dashboard');

    return { success: true, data: { paymentUrl: response.url, ...response } };

  } catch (error) {
    console.error('Failed to create collection payment:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message, data: error };
  }
}

export async function addSimulatedData(data: { paymentRecord: Payment, settlementRecord?: Settlement }): Promise<ActionResult> {
    try {
        payments.unshift(data.paymentRecord);
        if (data.settlementRecord) {
            settlements.unshift(data.settlementRecord);
        }
        await addAuditLog({
            eventType: 'simulation.created',
            user: 'admin@speedypay.com',
            details: `Created simulated payment ${data.paymentRecord.id}`,
            entityId: data.paymentRecord.id,
            entityType: 'payment',
        });
        revalidatePath('/dashboard');
        revalidatePath('/transactions');
        revalidatePath('/settlements');
        return { success: true };
    } catch(error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, message };
    }
}

export async function initiateRemittance(settlementId: string): Promise<ActionResult> {
    const settlement = await getSettlementById(settlementId);
    if (!settlement) {
        return { success: false, message: "Settlement not found." };
    }
    if (settlement.remittanceStatus !== 'pending') {
        return { success: false, message: `Cannot initiate remittance with status: ${settlement.remittanceStatus}`};
    }
    if (settlement.providerOrderSeq) {
        return { success: false, message: "Remittance already initiated. Query status instead." };
    }

    const merchant = await getMerchantById(settlement.merchantId);
    if (!merchant) {
        return { success: false, message: "Merchant not found." };
    }
    
    // Use unique internal settlement ID as the provider's orderSeq for idempotency
    const orderSeq = settlement.id;
    const channelInfo = payoutChannelMap.get(merchant.defaultPayoutChannel);
    if (!channelInfo) {
        return { success: false, message: `Invalid payout channel configured for merchant: ${merchant.defaultPayoutChannel}` };
    }

    // Use contact name for first/last name as it's more reliable than account name
    const names = merchant.contactName.split(' ');
    const firstName = names[0];
    const lastName = names.length > 1 ? names.slice(1).join(' ') : names[0];


    try {
        const response = await cashOut({
            orderSeq,
            amount: settlement.merchantNetAmount,
            procId: merchant.defaultPayoutChannel,
            procDetail: merchant.settlementAccountNumberOrWalletId,
            firstName,
            lastName,
            email: merchant.email,
            mobilePhone: merchant.mobile,
            remark: `Payout for settlement ${settlement.id}`,
        });

        const internalRemittanceStatus = mapProviderStateToInternal(response.transState);

        const updatedSettlement: Partial<Settlement> = {
            providerName: 'SpeedyPay',
            remittanceStatus: internalRemittanceStatus,
            providerOrderSeq: response.orderSeq,
            providerTransSeq: response.transSeq,
            providerRespCode: response.respCode,
            providerRespMessage: response.respMessage,
            providerTransState: response.transState,
            providerTransStateLabel: providerStateLabels[response.transState] || 'Unknown',
            signatureVerified: verifySignature(response, speedypayConfig.secretKey!),
            payoutChannelProcId: merchant.defaultPayoutChannel,
            payoutChannelDescription: channelInfo.description,
            providerTimestamp: response.timestamp,
            failureReason: response.respCode !== '00000000' ? response.respMessage : null,
            updatedAt: formatISO(new Date()),
        }
        
        await dbUpdateSettlement(settlement.id, updatedSettlement);

        await addAuditLog({
            eventType: 'payout.initiated',
            user: 'admin@speedypay.com',
            details: `Initiated payout to provider. OrderSeq: ${orderSeq}. Provider response: ${response.respMessage}`,
            entityId: settlement.id,
            entityType: 'settlement'
        });

        revalidatePath(`/settlements/${settlement.id}`);
        revalidatePath('/dashboard');
        revalidatePath('/settlements');
        return { success: true, message: 'Payout initiated successfully.', data: response };

    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred during payout initiation.";
        await addAuditLog({
            eventType: 'payout.initiation.failed',
            user: 'System',
            details: `Payout initiation failed. Error: ${message}`,
            entityId: settlement.id,
            entityType: 'settlement'
        });
        return { success: false, message, data: error };
    }
}

export async function querySettlementStatus(settlementId: string): Promise<ActionResult> {
     const settlement = await getSettlementById(settlementId);
    if (!settlement || !settlement.providerOrderSeq) {
        return { success: false, message: "Settlement not found or has no provider order sequence." };
    }

    try {
        const orderDate = format(parseISO(settlement.createdAt), 'yyyy-MM-dd');
        const response = await qryOrder({ 
            orderSeq: settlement.providerOrderSeq,
            orderDate: orderDate
        });
        
        const internalRemittanceStatus = mapProviderStateToInternal(response.transState);

        const updatedSettlement: Partial<Settlement> = {
            remittanceStatus: internalRemittanceStatus,
            providerTransSeq: response.transSeq,
            providerRespCode: response.respCode,
            providerRespMessage: response.respMessage,
            providerTransState: response.transState,
            providerTransStateLabel: providerStateLabels[response.transState] || 'Unknown',
            signatureVerified: verifySignature(response, speedypayConfig.secretKey!),
            providerTimestamp: response.timestamp,
            lastQueryAt: formatISO(new Date()),
            failureReason: response.respCode !== '00000000' ? response.respMessage : settlement.failureReason,
            updatedAt: formatISO(new Date()),
        }

        await dbUpdateSettlement(settlement.id, updatedSettlement);

         await addAuditLog({
            eventType: 'payout.status.queried',
            user: 'admin@speedypay.com',
            details: `Queried payout status. New provider state: ${response.transState} (${response.respMessage})`,
            entityId: settlement.id,
            entityType: 'settlement'
        });

        revalidatePath(`/settlements/${settlement.id}`);
        revalidatePath('/dashboard');
        revalidatePath('/settlements');
        return { success: true, message: 'Status updated from provider.', data: response };

    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred during status query.";
         await addAuditLog({
            eventType: 'payout.query.failed',
            user: 'System',
            details: `Payout query failed. Error: ${message}`,
            entityId: settlement.id,
            entityType: 'settlement'
        });
        return { success: false, message, data: error };
    }
}

export async function queryCollectionStatus(paymentId: string): Promise<ActionResult> {
     const payment = await getPaymentById(paymentId);
    if (!payment) {
        return { success: false, message: "Payment not found." };
    }

    try {
        const orderDate = format(parseISO(payment.createdAt), 'yyyy-MM-dd');
        const response = await qryCollectionOrder({ 
            orderSeq: payment.id,
            orderDate: orderDate,
        });

        const internalPaymentStatus = mapCollectionStateToPaymentStatus(response.transState);
        
        const updatedPayment: Partial<Payment> = {
            paymentStatus: internalPaymentStatus,
            providerTransState: response.transState,
            providerStateLabel: providerStateLabels[response.transState] || 'Unknown',
            providerCollectionRespCode: response.respCode,
            providerCollectionRespMessage: response.respMessage,
            providerCollectionSignatureVerified: verifySignature(response, speedypayConfig.secretKey!),
            lastQueryAt: formatISO(new Date()),
        }

        await updatePayment(payment.id, updatedPayment);

         await addAuditLog({
            eventType: 'collection.status.queried',
            user: 'admin@speedypay.com',
            details: `Queried collection status. New provider state: ${response.transState} (${response.respMessage})`,
            entityId: payment.id,
            entityType: 'payment'
        });

        revalidatePath(`/transactions/${payment.id}`);
        revalidatePath('/dashboard');
        return { success: true, message: 'Status updated from provider.', data: response };

    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred during status query.";
         await addAuditLog({
            eventType: 'collection.query.failed',
            user: 'System',
            details: `Collection query failed. Error: ${message}`,
            entityId: payment.id,
            entityType: 'payment'
        });
        return { success: false, message, data: error };
    }
}

export async function getProviderBalance(): Promise<ActionResult> {
    try {
        const response = await qryBalance();
        if (response.respCode !== '00000000') {
            throw new Error(response.respMessage || 'Failed to query balance.');
        }
        await addAuditLog({
            eventType: 'provider.balance.queried',
            user: 'admin@speedypay.com',
            details: `Successfully queried provider payout balance: PHP ${response.amount}`,
            entityId: null,
            entityType: null,
        });
        return { success: true, data: response };
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, message, data: error };
    }
}

export async function getCollectionProviderBalance(): Promise<ActionResult> {
    try {
        const response = await qryCollectionBalance();
        if (response.respCode !== '00000000') {
            throw new Error(response.respMessage || 'Failed to query collection balance.');
        }
        await addAuditLog({
            eventType: 'provider.collection_balance.queried',
            user: 'admin@speedypay.com',
            details: `Successfully queried provider collection balance: PHP ${response.balance}`,
            entityId: null,
            entityType: null,
        });
        return { success: true, data: response };
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, message, data: error };
    }
}


export async function runUATTestAction(testCaseId: string, payload?: UATTestPayload): Promise<ActionResult> {
    let result: ActionResult = { success: false, message: "Test case not found." };
    let entityId: string | null = null;
    let entityType: 'payment' | 'settlement' | 'merchant' | null = null;
    const user = 'UAT Tester';

    try {
        switch (testCaseId) {
            case 'COL-01': {
                if (!payload) throw new Error("Payload is required for COL-01");
                const createData = CreatePaymentSchema.parse(payload);
                result = await createCollectionPayment(createData);
                if (result.data?.url) {
                    const url = new URL(result.data.url);
                    entityId = url.searchParams.get('orderid');
                } else if (result.data?.orderSeq) {
                    entityId = result.data.orderSeq;
                }
                entityType = 'payment';
                break;
            }
            case 'COL-02': {
                if (!payload?.entityId) throw new Error("Missing entityId for COL-02");
                const { entityId: paymentId } = payload;
                result = await queryCollectionStatus(paymentId);
                entityId = paymentId;
                entityType = 'payment';
                break;
            }
            case 'PAY-01': {
                if (!payload?.entityId) throw new Error("Missing entityId for PAY-01");
                const { entityId: settlementId } = payload;
                result = await initiateRemittance(settlementId);
                entityId = settlementId;
                entityType = 'settlement';
                break;
            }
             case 'PAY-02': {
                if (!payload?.entityId) throw new Error("Missing entityId for PAY-02");
                const { entityId: settlementId } = payload;
                result = await querySettlementStatus(settlementId);
                entityId = settlementId;
                entityType = 'settlement';
                break;
            }
            case 'SYS-01':
                result = await getCollectionProviderBalance();
                break;
            case 'SYS-02':
                result = await getProviderBalance();
                break;
            default:
                throw new Error(`Unknown test case ID: ${testCaseId}`);
        }

        if (!result.success) {
            throw new Error(result.message || 'The action failed without a specific error message.');
        }

        await addUATLog({
            testCaseId,
            status: 'passed',
            notes: result.message || 'Test passed successfully.',
            entityId,
            entityType,
            providerResponse: JSON.stringify(result.data, null, 2),
        });

        await addAuditLog({
            eventType: 'uat.test.passed',
            user,
            details: `UAT case ${testCaseId} passed.`,
            entityId,
            entityType,
        });

        revalidatePath('/testing');
        return result;

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during the test.";
        await addUATLog({
            testCaseId,
            status: 'failed',
            notes: errorMessage,
            entityId,
            entityType,
            providerResponse: JSON.stringify(result.data, null, 2), // log the result even on failure
        });
        await addAuditLog({
            eventType: 'uat.test.failed',
            user,
            details: `UAT case ${testCaseId} failed: ${errorMessage}`,
            entityId,
            entityType,
        });
        revalidatePath('/testing');
        // Return a failed action result so the client knows it failed
        return { success: false, message: errorMessage, data: e };
    }
}

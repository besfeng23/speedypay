
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { format, formatISO, parseISO } from 'date-fns';
import { MerchantSchema, TenantSchema, CreatePaymentSchema, type MerchantFormValues, type TenantFormValues, type CreatePaymentFormValues } from './schemas';
import {
  addAuditLog,
  updatePayment,
  addUATLog,
  addPayment,
  addMerchant,
  addTenant,
  addSettlement,
  addPaymentAllocations,
  updateSettlement as dbUpdateSettlement,
  getSettlementById,
  getMerchantById,
  getPaymentById,
  getTenantById,
  getAllocationRules,
  findEntityById,
} from './data';
import type { Merchant, Settlement, Payment, Tenant, UATTestPayload, Entity, TenantRecord, MerchantAccount, SettlementDestination, PaymentAllocation } from './lib/types';
import { cashOut, qryOrder, qryBalance, createCollectionPayment as apiCreateCollectionPayment, qryCollectionOrder, qryCollectionBalance } from './speedypay/api';
import type { QrPayResponse, QryBalanceResponse, QryCollectionBalanceResponse } from './speedypay/types';
import { mapProviderStateToInternal, providerStateLabels, mapCollectionStateToPaymentStatus } from './speedypay/mappers';
import { payoutChannelMap } from './speedypay/payout-channels';
import { speedypayConfig } from './speedypay/config';
import { verifySignature } from './speedypay/crypto';
import { requireAdminSession } from './auth/session';
import { calculateAllocations } from './allocation';
import { withTransaction } from './db/postgres';


interface ActionResult<TData = unknown> {
  success: boolean;
  message?: string;
  data?: TData;
}

async function getAdminActorEmail(): Promise<string> {
  const session = await requireAdminSession();
  return session.email;
}

function getSpeedyPaySecretOrThrow(): string {
  if (!speedypayConfig.secretKey) {
    throw new Error('SPEEDYPAY_SECRET_KEY is not configured on the server.');
  }
  return speedypayConfig.secretKey;
}

export async function createTenant(values: TenantFormValues): Promise<ActionResult> {
  try {
    const actorEmail = await getAdminActorEmail();
    const validatedData = TenantSchema.parse(values);
    const now = new Date();

    const entity: Entity = {
        id: `ent-${uuidv4().slice(0, 8)}`,
        legalName: validatedData.name,
        displayName: validatedData.name,
        entityType: 'tenant',
        parentEntityId: 'ent-platform',
        status: 'active',
        metadata: {},
        createdAt: formatISO(now),
        updatedAt: formatISO(now),
    };
    
    const tenantRecord: TenantRecord = {
      id: `tnt-${uuidv4().slice(0, 8)}`,
      entityId: entity.id,
      tenantCode: validatedData.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8),
      status: 'active',
      settings: {},
      createdAt: formatISO(now),
      updatedAt: formatISO(now),
    };

    await addTenant({ ...tenantRecord, entity });

    await addAuditLog({
      eventType: 'tenant.created',
      user: actorEmail,
      details: `Created new tenant: ${validatedData.name} (ID: ${tenantRecord.id})`,
      entityId: tenantRecord.id,
      entityType: 'tenant'
    });

    revalidatePath('/tenants');
    revalidatePath('/dashboard');

    return { success: true };

  } catch (error) {
    console.error('Failed to create tenant:', error);
    let message = 'An unknown error occurred.';
    if (error instanceof z.ZodError) {
      message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    } else if (error instanceof Error) {
        message = error.message;
    }
    return { success: false, message };
  }
}

export async function createMerchant(values: MerchantFormValues): Promise<ActionResult> {
  try {
    const actorEmail = await getAdminActorEmail();
    const validatedData = MerchantSchema.parse(values);
    
    const tenant = await getTenantById(validatedData.tenantId);
    if (!tenant) {
      return { success: false, message: 'Invalid Tenant ID provided.' };
    }

    const now = new Date();

    const entity: Entity = {
        id: `ent-${uuidv4().slice(0, 8)}`,
        legalName: validatedData.businessName,
        displayName: validatedData.displayName,
        entityType: 'merchant',
        parentEntityId: tenant.entityId,
        status: 'active',
        metadata: {
            contactName: validatedData.contactName,
            email: validatedData.email,
            mobile: validatedData.mobile,
        },
        createdAt: formatISO(now),
        updatedAt: formatISO(now),
    };
    
    const merchantAccount: MerchantAccount = {
      id: `mer-${uuidv4().slice(0, 8)}`,
      entityId: entity.id,
      tenantId: validatedData.tenantId,
      onboardingStatus: validatedData.onboardingStatus,
      kycStatus: 'pending',
      settlementStatus: 'active',
      defaultSettlementDestinationId: null, // This would be created in a separate step
      createdAt: formatISO(now),
      updatedAt: formatISO(now),
    };
    
    // In a real app, you'd create the SettlementDestination and link its ID here.
    // For now, we are creating the merchant without a default destination.

    await addMerchant({ ...merchantAccount, entity, tenant, defaultSettlementDestination: null });

    await addAuditLog({
      eventType: 'merchant.created',
      user: actorEmail,
      details: `Created new merchant: ${validatedData.displayName} for tenant ${tenant.name}`,
      entityId: merchantAccount.id,
      entityType: 'merchant'
    });

    revalidatePath('/merchants');
    revalidatePath(`/tenants/${tenant.id}`);
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

export async function createCollectionPayment(values: CreatePaymentFormValues): Promise<ActionResult<{ paymentUrl: string } & QrPayResponse>> {
  try {
    const actorEmail = await getAdminActorEmail();
    const validatedData = CreatePaymentSchema.parse(values);
    const { amount, merchantId, description } = validatedData;
    
    const merchant = await getMerchantById(merchantId);
    if (!merchant) {
      return { success: false, message: 'Merchant not found.' };
    }

    const orderSeq = `pay-${uuidv4()}`;

    // --- Start Transactional Logic ---
    
    // Step 1: Call the external provider API FIRST.
    const response = await apiCreateCollectionPayment({
        orderSeq: orderSeq,
        amount: amount,
        busiName: merchant.entity.displayName,
        dueTime: 60, // 60 minutes
        remark: description
    });
    
    // Step 2: Check for a successful response from the provider.
    if (response.respCode !== '00000000' || !response.url) {
      await addAuditLog({ eventType: 'payment.provider.failed', user: 'System', details: `Provider failed to create payment link: ${response.respMessage}`, entityId: orderSeq, entityType: 'payment' });
      throw new Error(response.respMessage || 'Failed to create payment link at provider.');
    }
    
    const isSignatureVerified = verifySignature(response, getSpeedyPaySecretOrThrow());

    // Step 3: Use the new allocation engine to calculate the fee breakdown
    const allocations = await calculateAllocations({
        grossAmount: amount,
        currency: 'PHP',
        merchantAccountId: merchant.id,
        tenantId: merchant.tenantId,
    });
    
    const merchantNet = allocations.find(a => a.allocationType === 'merchant_net');
    const totalFees = allocations
        .filter(a => a.allocationType !== 'merchant_net')
        .reduce((sum, a) => sum + a.amount, 0);

    const merchantNetAmount = merchantNet?.amount ?? 0;

    // Step 4: Create the internal records within a database transaction.
    await withTransaction(async (client) => {
        const now = new Date();
        const newPayment: Payment = {
            id: orderSeq,
            tenantId: merchant.tenantId,
            externalReference: 'N/A',
            bookingReferenceOrInvoiceReference: description,
            customerName: 'N/A (Generated Link)',
            customerEmail: 'N/A',
            merchantId: merchantId,
            grossAmount: amount,
            currency: 'PHP',
            // These fee fields are now summary fields for quick reference.
            // The source of truth is the payment_allocations table.
            feeType: 'percentage', // This field is becoming less relevant.
            feeValue: 0, // This field is becoming less relevant.
            platformFeeAmount: totalFees,
            merchantNetAmount,
            paymentStatus: 'pending',
            settlementStatus: 'pending',
            remittanceStatus: 'pending',
            sourceChannel: 'Manual',
            createdAt: formatISO(now),
            updatedAt: formatISO(now),
            providerPaymentUrl: response.url,
            providerCollectionRespCode: response.respCode,
            providerCollectionRespMessage: response.respMessage,
            providerCollectionSignatureVerified: isSignatureVerified,
        };
        await addPayment(newPayment, client);

        const allocationsForDb = allocations.map(alloc => ({ ...alloc, paymentId: orderSeq }));
        await addPaymentAllocations(allocationsForDb, client);
    });
    
    // Step 5: Log the successful creation and provider interaction.
    await addAuditLog({ eventType: 'payment.created', user: actorEmail, details: `Created manual payment link for ${merchant.entity.displayName}`, entityId: orderSeq, entityType: 'payment' });
    await addAuditLog({ eventType: 'payment.provider.sent', user: 'System', details: `Successfully created payment link at provider. URL: ${response.url}`, entityId: orderSeq, entityType: 'payment' });

    revalidatePath('/transactions');
    revalidatePath(`/transactions/${orderSeq}`);
    revalidatePath('/dashboard');

    return { success: true, data: { paymentUrl: response.url, ...response } };

  } catch (error) {
    console.error('Failed to create collection payment:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message };
  }
}

export async function addSimulatedData(data: { paymentRecord: Payment, settlementRecord?: Settlement }): Promise<ActionResult> {
    try {
        const actorEmail = await getAdminActorEmail();
        
        const merchant = await getMerchantById(data.paymentRecord.merchantId);
        if (!merchant) {
            throw new Error('Simulated data references a non-existent merchant.');
        }

        data.paymentRecord.tenantId = merchant.tenantId;
        if (data.settlementRecord) {
            data.settlementRecord.tenantId = merchant.tenantId;
        }

        await addPayment(data.paymentRecord);
        if (data.settlementRecord) {
            await addSettlement(data.settlementRecord);
        }
        await addAuditLog({
            eventType: 'simulation.created',
            user: actorEmail,
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
    const actorEmail = await getAdminActorEmail();
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
    if (!merchant || !merchant.defaultSettlementDestination) {
        return { success: false, message: "Merchant not found or has no default settlement destination." };
    }
    
    // Use unique internal settlement ID as the provider's orderSeq for idempotency
    const orderSeq = settlement.id;
    const channelInfo = payoutChannelMap.get(merchant.defaultSettlementDestination.bankCode);
    if (!channelInfo) {
        return { success: false, message: `Invalid payout channel configured for merchant: ${merchant.defaultSettlementDestination.bankCode}` };
    }

    // Use contact name for first/last name as it's more reliable than account name
    const names = (merchant.entity.metadata.contactName as string).split(' ');
    const firstName = names[0];
    const lastName = names.length > 1 ? names.slice(1).join(' ') : names[0];


    try {
        const response = await cashOut({
            orderSeq,
            amount: settlement.merchantNetAmount,
            procId: merchant.defaultSettlementDestination.bankCode,
            procDetail: merchant.defaultSettlementDestination.accountNumberMasked, // NOTE: In production, this should be the real, unmasked number.
            firstName,
            lastName,
            email: merchant.entity.metadata.email,
            mobilePhone: merchant.entity.metadata.mobile,
            remark: `Payout for settlement ${settlement.id}`,
        });

        const internalRemittanceStatus = mapProviderStateToInternal(response.transState);
        const previousRemittanceStatus = settlement.remittanceStatus;

        const updatedSettlement: Partial<Settlement> = {
            providerName: 'SpeedyPay',
            remittanceStatus: internalRemittanceStatus,
            providerOrderSeq: response.orderSeq,
            providerTransSeq: response.transSeq,
            providerRespCode: response.respCode,
            providerRespMessage: response.respMessage,
            providerTransState: response.transState,
            providerTransStateLabel: providerStateLabels[response.transState] || 'Unknown',
            signatureVerified: verifySignature(response, getSpeedyPaySecretOrThrow()),
            payoutChannelProcId: merchant.defaultSettlementDestination.bankCode,
            payoutChannelDescription: channelInfo.description,
            providerTimestamp: response.timestamp,
            failureReason: response.respCode !== '00000000' ? response.respMessage : null,
            updatedAt: formatISO(new Date()),
        }
        
        await dbUpdateSettlement(settlement.id, updatedSettlement);

        await addAuditLog({
            eventType: 'payout.initiated',
            user: actorEmail,
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
        return { success: false, message };
    }
}

export async function querySettlementStatus(settlementId: string): Promise<ActionResult> {
    const actorEmail = await getAdminActorEmail();
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
        const previousRemittanceStatus = settlement.remittanceStatus;

        const updatedSettlement: Partial<Settlement> = {
            remittanceStatus: internalRemittanceStatus,
            providerTransSeq: response.transSeq,
            providerRespCode: response.respCode,
            providerRespMessage: response.respMessage,
            providerTransState: response.transState,
            providerTransStateLabel: providerStateLabels[response.transState] || 'Unknown',
            signatureVerified: verifySignature(response, getSpeedyPaySecretOrThrow()),
            providerTimestamp: response.timestamp,
            lastQueryAt: formatISO(new Date()),
            failureReason: response.respCode !== '00000000' ? response.respMessage : settlement.failureReason,
            updatedAt: formatISO(new Date()),
        }

        await dbUpdateSettlement(settlement.id, updatedSettlement);

         await addAuditLog({
            eventType: 'payout.status.queried',
            user: actorEmail,
            details: `Queried payout status. New provider state: ${response.transState} (${response.respMessage})`,
            entityId: settlement.id,
            entityType: 'settlement',
            source: 'admin',
            action: 'query_payout_status',
            previousState: previousRemittanceStatus,
            newState: internalRemittanceStatus,
            outcome: 'success',
            correlationId: response.transSeq,
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
        return { success: false, message };
    }
}

export async function queryCollectionStatus(paymentId: string): Promise<ActionResult> {
    const actorEmail = await getAdminActorEmail();
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
        const previousPaymentStatus = payment.paymentStatus;
        
        const updatedPayment: Partial<Payment> = {
            paymentStatus: internalPaymentStatus,
            providerTransState: response.transState,
            providerStateLabel: providerStateLabels[response.transState] || 'Unknown',
            providerCollectionRespCode: response.respCode,
            providerCollectionRespMessage: response.respMessage,
            providerCollectionSignatureVerified: verifySignature(response, getSpeedyPaySecretOrThrow()),
            lastQueryAt: formatISO(new Date()),
        }

        await updatePayment(payment.id, updatedPayment);

         await addAuditLog({
            eventType: 'collection.status.queried',
            user: actorEmail,
            details: `Queried collection status. New provider state: ${response.transState} (${response.respMessage})`,
            entityId: payment.id,
            entityType: 'payment',
            source: 'admin',
            action: 'query_collection_status',
            previousState: previousPaymentStatus,
            newState: internalPaymentStatus,
            outcome: 'success',
            correlationId: response.transSeq,
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
        return { success: false, message };
    }
}

export async function getProviderBalance(): Promise<ActionResult<QryBalanceResponse>> {
    try {
        const actorEmail = await getAdminActorEmail();
        const response = await qryBalance();
        if (response.respCode !== '00000000') {
            throw new Error(response.respMessage || 'Failed to query balance.');
        }
        await addAuditLog({
            eventType: 'provider.balance.queried',
            user: actorEmail,
            details: `Successfully queried provider payout balance: PHP ${response.amount}`,
            entityId: null,
            entityType: null,
        });
        return { success: true, data: response };
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, message };
    }
}

export async function getCollectionProviderBalance(): Promise<ActionResult<QryCollectionBalanceResponse>> {
    try {
        const actorEmail = await getAdminActorEmail();
        const response = await qryCollectionBalance();
        if (response.respCode !== '00000000') {
            throw new Error(response.respMessage || 'Failed to query collection balance.');
        }
        await addAuditLog({
            eventType: 'provider.collection_balance.queried',
            user: actorEmail,
            details: `Successfully queried provider collection balance: PHP ${response.balance}`,
            entityId: null,
            entityType: null,
        });
        return { success: true, data: response };
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, message };
    }
}

export async function getPublicProviderConfig(): Promise<ActionResult<{
    env: string;
    payoutBaseUrl: string;
    cashierBaseUrl: string;
    notifyUrlConfigured: boolean;
    merchSeqConfigured: boolean;
    secretKeyConfigured: boolean;
}>> {
    await getAdminActorEmail();
    return {
        success: true,
        data: {
            env: speedypayConfig.env,
            payoutBaseUrl: speedypayConfig.payoutBaseUrl,
            cashierBaseUrl: speedypayConfig.cashierBaseUrl,
            notifyUrlConfigured: Boolean(speedypayConfig.notifyUrl),
            merchSeqConfigured: Boolean(speedypayConfig.merchSeq),
            secretKeyConfigured: Boolean(speedypayConfig.secretKey),
        },
    };
}


export async function runUATTestAction(testCaseId: string, payload?: UATTestPayload): Promise<ActionResult> {
    await getAdminActorEmail();
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
                if (result.data && typeof result.data === 'object' && 'url' in result.data && typeof result.data.url === 'string') {
                    const url = new URL(result.data.url);
                    entityId = url.searchParams.get('orderid');
                } else if (result.data && typeof result.data === 'object' && 'orderSeq' in result.data && typeof result.data.orderSeq === 'string') {
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

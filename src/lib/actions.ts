
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
  addPayout,
  addPaymentAllocations,
  addLedgerTransactionAndEntries,
  updateSettlement as dbUpdateSettlement,
  getSettlementById,
  getMerchantById,
  getPaymentById,
  getTenantById,
  findEntityById,
  withTransaction,
} from './data';
import type { Merchant, Settlement, Payment, Tenant, UATTestPayload, Entity, TenantRecord, MerchantAccount, SettlementDestination, PaymentAllocation, LedgerTransaction, LedgerEntry, Payout, InternalSettlementStatus } from './types';
import { cashOut, qryOrder, qryBalance, createCollectionPayment as apiCreateCollectionPayment, qryCollectionOrder, qryCollectionBalance } from './speedypay/api';
import type { QrPayResponse, QryBalanceResponse, QryCollectionBalanceResponse } from './speedypay/types';
import { mapProviderStateToInternal, providerStateLabels, mapCollectionStateToPaymentStatus } from './speedypay/mappers';
import { payoutChannelMap } from './speedypay/payout-channels';
import { speedypayConfig } from './speedypay/config';
import { verifySignature } from './speedypay/crypto';
import { requireAdminSession } from './auth/session';
import { calculateAllocations } from './allocation';
import { createLedgerEntriesForPaymentCapture } from './ledger';


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
        metadata: {
            notes: validatedData.notes,
            platformFeeType: validatedData.platformFeeType,
            platformFeeValue: validatedData.platformFeeValue,
        },
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

    const tenant: Tenant = { ...tenantRecord, name: entity.displayName, ...validatedData, entity };
    await addTenant(tenant);

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
            notes: validatedData.notes,
            defaultFeeType: validatedData.defaultFeeType,
            defaultFeeValue: validatedData.defaultFeeValue,
        },
        createdAt: formatISO(now),
        updatedAt: formatISO(now),
    };
    
    const merchantAccount: MerchantAccount = {
      id: `mer-${uuidv4().slice(0, 8)}`,
      entityId: entity.id,
      tenantId: validatedData.tenantId,
      onboardingStatus: validatedData.onboardingStatus,
      kycStatus: 'not_started',
      riskStatus: 'not_assessed',
      activationStatus: 'inactive',
      settlementStatus: 'active',
      defaultSettlementDestinationId: null, // This would be created in a separate step
      createdAt: formatISO(now),
      updatedAt: formatISO(now),
    };
    
    const settlementDestination: SettlementDestination = {
        id: `sd-${uuidv4().slice(0, 8)}`,
        merchantAccountId: merchantAccount.id,
        destinationType: payoutChannelMap.get(validatedData.defaultPayoutChannel)?.type === 'Bank' ? 'bank' : 'wallet',
        accountName: validatedData.settlementAccountName,
        accountNumberMasked: validatedData.settlementAccountNumberOrWalletId,
        bankCode: validatedData.defaultPayoutChannel,
        providerReference: null,
        verificationStatus: 'unverified',
        isDefault: true,
        createdAt: formatISO(now),
        updatedAt: formatISO(now),
    }

    merchantAccount.defaultSettlementDestinationId = settlementDestination.id;

    const merchant: Merchant = {
        ...merchantAccount,
        businessName: entity.legalName,
        ...validatedData,
        status: entity.status as 'active' | 'inactive' | 'suspended',
        entity,
        tenant,
        defaultSettlementDestination: settlementDestination,
        propertyAssociations: []
    }

    await addMerchant(merchant);

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
    const now = new Date();

    const response = await apiCreateCollectionPayment({
        orderSeq: orderSeq,
        amount: amount,
        busiName: merchant.entity.displayName,
        dueTime: 60,
        remark: description
    });
    
    if (response.respCode !== '00000000' || !response.url) {
      await addAuditLog({ eventType: 'payment.provider.failed', user: 'System', details: `Provider failed to create payment link: ${response.respMessage}`, entityId: orderSeq, entityType: 'payment' });
      throw new Error(response.respMessage || 'Failed to create payment link at provider.');
    }
    
    const isSignatureVerified = verifySignature(response, getSpeedyPaySecretOrThrow());

    await withTransaction(async (client) => {
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
        
        const newPayment: Payment = {
            id: orderSeq,
            tenantId: merchant.tenantId,
            merchantId: merchantId,
            externalReference: 'N/A',
            bookingReferenceOrInvoiceReference: description,
            customerName: 'N/A (Generated Link)',
            customerEmail: 'N/A',
            grossAmount: amount,
            currency: 'PHP',
            platformFeeAmount: totalFees,
            merchantNetAmount,
            paymentStatus: 'pending',
            settlementStatus: 'pending',
            createdAt: formatISO(now),
            updatedAt: formatISO(now),
            providerPaymentUrl: response.url,
            providerCollectionRespCode: response.respCode,
            providerCollectionRespMessage: response.respMessage,
            providerCollectionSignatureVerified: isSignatureVerified,
        };
        
        const ledgerEntries = await createLedgerEntriesForPaymentCapture(newPayment, allocations);
        const ledgerTransaction: Omit<LedgerTransaction, 'id' | 'createdAt' | 'updatedAt'> = {
            paymentId: newPayment.id,
            payoutId: null,
            transactionType: 'payment_capture',
            status: 'completed',
            reference: `Payment from ${newPayment.customerName}`,
        };

        await addPayment(newPayment, client);
        await addPaymentAllocations(allocations.map(alloc => ({ ...alloc, paymentId: orderSeq })), client);
        await addLedgerTransactionAndEntries(ledgerTransaction, ledgerEntries, client);
    });
    
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

export async function addSimulatedData(data: { paymentRecord: Payment, settlementRecord?: Settlement, payoutRecord?: Payout }): Promise<ActionResult> {
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
        if (data.payoutRecord) {
            await addPayout(data.payoutRecord);
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
    if (settlement.status !== 'unpaid') {
        return { success: false, message: `Cannot initiate payout for settlement with status: ${settlement.status}`};
    }

    const merchant = await getMerchantById(settlement.merchantId);
    if (!merchant || !merchant.defaultSettlementDestination) {
        return { success: false, message: "Merchant not found or has no default settlement destination." };
    }
    
    const orderSeq = `po-${uuidv4().slice(0,12)}`;
    const channelInfo = payoutChannelMap.get(merchant.defaultSettlementDestination.bankCode);
    if (!channelInfo) {
        return { success: false, message: `Invalid payout channel configured for merchant: ${merchant.defaultSettlementDestination.bankCode}` };
    }
    
    const names = (merchant.entity.metadata.contactName as string).split(' ');
    const firstName = names[0];
    const lastName = names.length > 1 ? names.slice(1).join(' ') : names[0];

    try {
        const now = new Date();
        
        await withTransaction(async (client) => {
            const payout: Payout = {
                id: orderSeq,
                settlementId: settlement.id,
                merchantAccountId: merchant.id,
                settlementDestinationId: merchant.defaultSettlementDestination!.id,
                amount: settlement.merchantNetAmount,
                currency: settlement.currency,
                status: 'processing',
                providerName: 'SpeedyPay',
                payoutChannelProcId: channelInfo.procId,
                payoutChannelDescription: channelInfo.description,
                createdAt: formatISO(now),
                updatedAt: formatISO(now),
            };
            
            await addPayout(payout, client);
            
            await dbUpdateSettlement(settlement.id, {
                status: 'processing',
                payoutId: payout.id,
                updatedAt: formatISO(now),
            }, client);
        });

        const response = await cashOut({
            orderSeq,
            amount: settlement.merchantNetAmount,
            procId: merchant.defaultSettlementDestination.bankCode,
            procDetail: merchant.defaultSettlementDestination.accountNumberMasked,
            firstName,
            lastName,
            email: merchant.entity.metadata.email,
            mobilePhone: merchant.entity.metadata.mobile,
            remark: `Payout for settlement ${settlement.id}`,
        });

        await addAuditLog({
            eventType: 'payout.initiated',
            user: actorEmail,
            details: `Initiated payout to provider. OrderSeq: ${orderSeq}. Provider response: ${response.respMessage}`,
            entityId: orderSeq,
            entityType: 'payout'
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
        // Rollback the settlement status if API call fails
        await dbUpdateSettlement(settlement.id, { status: 'unpaid', payoutId: null });
        return { success: false, message };
    }
}

export async function querySettlementStatus(settlementId: string): Promise<ActionResult> {
    const actorEmail = await getAdminActorEmail();
     const settlement = await getSettlementById(settlementId);
    if (!settlement || !settlement.payoutId) {
        return { success: false, message: "Settlement not found or has no provider order sequence." };
    }

    try {
        const orderDate = format(parseISO(settlement.createdAt), 'yyyy-MM-dd');
        const response = await qryOrder({ 
            orderSeq: settlement.payoutId,
            orderDate: orderDate
        });
        
        const internalStatus = mapProviderStateToInternal(response.transState);
        const finalSettlementStatus: InternalSettlementStatus = internalStatus === 'sent' ? 'paid' : internalStatus === 'failed' ? 'failed' : 'processing';

        await dbUpdateSettlement(settlement.id, {
            status: finalSettlementStatus,
            updatedAt: formatISO(new Date()),
        });

         await addAuditLog({
            eventType: 'payout.status.queried',
            user: actorEmail,
            details: `Queried payout status. New provider state: ${response.transState} (${response.respMessage})`,
            entityId: settlement.payoutId,
            entityType: 'payout',
            source: 'admin',
            action: 'query_payout_status',
            previousState: settlement.status,
            newState: finalSettlementStatus,
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
            entityType: 'payout'
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
    let entityType: 'payment' | 'settlement' | 'merchant' | 'payout' | null = null;
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
                entityType = 'payout';
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
            providerResponse: JSON.stringify(result.data, null, 2),
        });
        await addAuditLog({
            eventType: 'uat.test.failed',
            user,
            details: `UAT case ${testCaseId} failed: ${errorMessage}`,
            entityId,
            entityType,
        });
        revalidatePath('/testing');
        return { success: false, message: errorMessage, data: e };
    }
}

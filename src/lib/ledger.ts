import 'server-only';

import type { PaymentAllocation, Payment, LedgerEntry, AccountCode } from './types';
import { findEntityById, getMerchantById } from './data';

type UnsavedLedgerEntry = Omit<LedgerEntry, 'id' | 'ledgerTransactionId' | 'createdAt'>;

/**
 * Creates a balanced set of ledger entries for a captured payment based on its allocations.
 *
 * @param payment The successfully captured payment record.
 * @param allocations The calculated allocation breakdown for the payment.
 * @returns A promise that resolves to an array of unsaved ledger entries.
 * @throws An error if the generated ledger entries are not balanced.
 */
export async function createLedgerEntriesForPaymentCapture(
    payment: Payment,
    allocations: Omit<PaymentAllocation, 'id' | 'paymentId' | 'createdAt'>[]
): Promise<UnsavedLedgerEntry[]> {

    const entries: UnsavedLedgerEntry[] = [];
    const { grossAmount, currency } = payment;

    // The initial debit: represents the total amount captured from the customer,
    // held in a temporary clearing account.
    entries.push({
        entityId: 'ent-platform', // The platform entity manages the clearing account
        accountCode: 'customer_clearing',
        entryType: 'debit',
        amount: grossAmount,
        currency,
        description: `Payment capture for ${payment.id}`,
    });

    // The corresponding credits, which distribute the captured funds.
    for (const allocation of allocations) {
        let accountCode: AccountCode;
        let description: string;
        
        const recipient = await findEntityById(allocation.recipientEntityId);
        if (!recipient) {
            throw new Error(`Could not find recipient entity with ID: ${allocation.recipientEntityId}`);
        }

        switch (allocation.allocationType) {
            case 'processing_fee':
                accountCode = 'processor_fee_revenue';
                description = `Processor fee for ${recipient.displayName}`;
                break;
            case 'platform_fee':
                accountCode = 'platform_fee_revenue';
                description = `Platform fee for ${recipient.displayName}`;
                break;
            case 'tenant_fee':
                accountCode = 'tenant_fee_revenue';
                description = `Tenant fee for ${recipient.displayName}`;
                break;
            case 'merchant_net':
                accountCode = 'merchant_settlement_payable';
                description = `Net amount payable to ${recipient.displayName}`;
                break;
            case 'reserve':
                accountCode = 'reserve_payable';
                description = `Reserve holdback for ${recipient.displayName}`;
                break;
            default:
                throw new Error(`Unknown allocation type: ${allocation.allocationType}`);
        }

        entries.push({
            entityId: allocation.recipientEntityId,
            accountCode,
            entryType: 'credit',
            amount: allocation.amount,
            currency,
            description,
        });
    }

    // --- Validation: Ensure the transaction is balanced ---
    const totalDebits = entries
        .filter(e => e.entryType === 'debit')
        .reduce((sum, e) => sum + Math.round(e.amount * 100), 0);

    const totalCredits = entries
        .filter(e => e.entryType === 'credit')
        .reduce((sum, e) => sum + Math.round(e.amount * 100), 0);

    if (totalDebits !== totalCredits) {
        console.error("Ledger Balance Error", { totalDebits, totalCredits, paymentId: payment.id });
        throw new Error(`Critical Ledger Error: Debits (${totalDebits}) do not equal Credits (${totalCredits}) for payment ${payment.id}.`);
    }
    
    if (totalDebits !== Math.round(grossAmount * 100)) {
        console.error("Ledger Reconciliation Error", { totalDebits, grossAmount: Math.round(grossAmount * 100), paymentId: payment.id });
        throw new Error(`Critical Ledger Error: Total debits do not match gross payment amount for payment ${payment.id}.`);
    }

    return entries;
}

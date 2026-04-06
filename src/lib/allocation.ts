import { AllocationRule, PaymentAllocation, AllocationType } from "./types";
import { getAllocationRules } from "./data";

// Use a specific type for the context required for calculation
type AllocationContext = {
    grossAmount: number;
    currency: string;
    merchantAccountId: string;
    tenantId: string;
    paymentMethod?: string;
};

/**
 * Calculates the full breakdown of a payment into its constituent allocations.
 * This is a deterministic engine that applies rules in order of priority.
 *
 * @param context - The context of the payment to be allocated.
 * @returns An array of PaymentAllocation objects.
 * @throws An error if the total allocations do not reconcile with the gross amount.
 */
export async function calculateAllocations(context: AllocationContext): Promise<Omit<PaymentAllocation, 'id' | 'paymentId' | 'createdAt'>[]> {
    const { grossAmount, currency, merchantAccountId, tenantId, paymentMethod = 'all' } = context;

    // Convert to cents to avoid floating point issues
    const grossAmountInCents = Math.round(grossAmount * 100);
    let remainingCents = grossAmountInCents;
    
    const allocations: Omit<PaymentAllocation, 'id' | 'paymentId' | 'createdAt'>[] = [];
    const allRules = await getAllocationRules();

    // Filter rules relevant to this transaction
    const applicableRules = allRules.filter(rule => 
        (rule.paymentMethod === 'all' || rule.paymentMethod === paymentMethod) &&
        (
            !rule.tenantId && !rule.merchantAccountId || // Global rule
            rule.tenantId === tenantId && !rule.merchantAccountId || // Tenant-level rule
            rule.merchantAccountId === merchantAccountId // Merchant-level rule
        )
    );

    for (const rule of applicableRules) {
        if (remainingCents <= 0) break;

        let feeCents = 0;
        let basisType: 'flat' | 'percentage' = 'flat';

        if (rule.flatValue) {
            feeCents += Math.round(rule.flatValue * 100);
        }
        if (rule.percentageValue) {
            basisType = 'percentage';
            // Percentage is calculated on the original gross amount
            feeCents += Math.round(grossAmountInCents * (rule.percentageValue / 100));
        }

        // Ensure we don't allocate more than what's remaining
        const actualFeeCents = Math.min(feeCents, remainingCents);
        
        if (actualFeeCents > 0) {
            allocations.push({
                allocationType: rule.ruleType,
                recipientEntityId: rule.recipientEntityId,
                basisType: basisType,
                amount: actualFeeCents / 100, // Convert back to decimal for storage/display
                currency,
                ruleReference: rule.id,
            });
            remainingCents -= actualFeeCents;
        }
    }

    // Anything left over goes to the merchant
    if (remainingCents > 0) {
        const merchantEntity = await (await import('./data')).findEntityById((await (await import('./data')).getMerchantById(merchantAccountId))!.entityId);
        allocations.push({
            allocationType: 'merchant_net',
            recipientEntityId: merchantEntity!.id,
            basisType: 'rule', // Indicates it's the remainder
            amount: remainingCents / 100,
            currency,
            ruleReference: null,
        });
    }

    // --- Final Validation ---
    const totalAllocatedCents = allocations.reduce((sum, alloc) => sum + Math.round(alloc.amount * 100), 0);

    if (totalAllocatedCents !== grossAmountInCents) {
        console.error("Allocation Reconciliation Error", { totalAllocatedCents, grossAmountInCents });
        throw new Error(`Critical Error: Payment allocation failed to reconcile. Gross: ${grossAmount}, Allocated: ${totalAllocatedCents / 100}`);
    }

    return allocations;
}

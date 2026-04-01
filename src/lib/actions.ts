'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { formatISO } from 'date-fns';
import { MerchantSchema, type MerchantFormValues } from './schemas';
import { merchants, addAuditLog } from './data';
import type { Merchant } from './types';

interface ActionResult {
  success: boolean;
  message?: string;
}

export async function createMerchant(values: MerchantFormValues): Promise<ActionResult> {
  try {
    // 1. Validate the input using Zod schema
    const validatedData = MerchantSchema.parse(values);

    // 2. Create the full merchant record
    const now = formatISO(new Date());
    const newMerchant: Merchant = {
      id: `mer-${uuidv4().slice(0, 8)}`,
      status: 'Active', // Default status for new merchants
      propertyAssociations: [], // Default empty
      createdAt: now,
      updatedAt: now,
      ...validatedData,
    };
    
    // In a real app, this would be a database insert.
    // For this demo, we're pushing to an in-memory array.
    merchants.unshift(newMerchant);

    // 3. Create an audit log for the action
    await addAuditLog({
      eventType: 'merchant.created',
      user: 'admin@speedypay.com', // In a real app, get this from the session
      details: `Created new merchant: ${newMerchant.displayName} (ID: ${newMerchant.id})`,
      entityId: newMerchant.id,
    });

    // 4. Revalidate cache for pages that display merchant data
    revalidatePath('/merchants');
    revalidatePath('/dashboard');

    return { success: true };

  } catch (error) {
    console.error('Failed to create merchant:', error);
    let message = 'An unknown error occurred.';
    if (error instanceof z.ZodError) {
      // Combine Zod error messages for a more informative response
      message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    } else if (error instanceof Error) {
        message = error.message;
    }
    return { success: false, message };
  }
}

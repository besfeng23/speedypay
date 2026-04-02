/**
 * @fileoverview This file contains the list of supported payout channels for SpeedyPay/eMango Pay.
 * The data is based on the provided payout channel sheet and should be updated if the provider adds or removes channels.
 */

export interface PayoutChannel {
  procId: string;
  description: string;
  type: 'Bank' | 'E-Wallet' | 'OTC';
  minAmount?: number;
  maxAmount?: number;
  notes?: string;
}

export const payoutChannels: PayoutChannel[] = [
  // E-Wallets
  { procId: 'GCASH', description: 'GCash', type: 'E-Wallet', minAmount: 1, maxAmount: 50000 },
  { procId: 'PAYMAYA', description: 'PayMaya', type: 'E-Wallet', minAmount: 1, maxAmount: 100000 },
  { procId: 'GRABPAY', description: 'GrabPay', type: 'E-Wallet', minAmount: 1, maxAmount: 49999 },
  
  // Banks via InstaPay
  { procId: 'BPI', description: 'BPI (InstaPay)', type: 'Bank', maxAmount: 50000 },
  { procId: 'BDO', description: 'BDO (InstaPay)', type: 'Bank', maxAmount: 50000 },
  { procId: 'UBP', description: 'Unionbank (InstaPay)', type: 'Bank', maxAmount: 50000 },
  { procId: 'SEABANK', description: 'SeaBank', type: 'Bank', maxAmount: 50000 },
  { procId: 'RCBC', description: 'RCBC', type: 'Bank', maxAmount: 50000 },
  
  // Banks via PESONet
  { procId: 'BDO_PESONET', description: 'BDO (PESONet)', type: 'Bank' },
  { procId: 'UBP_PESONET', description: 'Unionbank (PESONet)', type: 'Bank' },
  { procId: 'PSBANK_PESONET', description: 'PSBank (PESONet)', type: 'Bank' },
  { procId: 'AUB_PESONET', description: 'AUB (PESONet)', type: 'Bank' },

  // Over-the-Counter (OTC)
  { procId: 'PALAWAN', description: 'Palawan Express', type: 'OTC', maxAmount: 50000 },
  { procId: 'CEBUANA', description: 'Cebuana Lhuillier', type: 'OTC', maxAmount: 30000 },
  { procId: 'MLHUILLIER', description: 'M Lhuillier', type: 'OTC', maxAmount: 40000 },
];

export const payoutChannelMap = new Map(payoutChannels.map(c => [c.procId, c]));

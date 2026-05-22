import { PaymentSource } from '../types/models';

const PAYMENT_SOURCE_TRANSLATION_KEYS: Record<PaymentSource, string> = {
  external: 'externalFunds',
  revenue: 'businessCash',
  mixed: 'mixedSources',
};

/** Maps payment source values to transactions.* i18n keys */
export const getPaymentSourceTranslationKey = (source: PaymentSource): string =>
  PAYMENT_SOURCE_TRANSLATION_KEYS[source];

/**
 * Maps transaction category keys to translation keys
 */
export const getTransactionCategoryTranslationKey = (category: string): string => {
  const categoryMap: Record<string, string> = {
    Packaging: 'packaging',
    Marketing: 'marketing',
    'Platform Fees': 'platformFees',
    'Payment Processing': 'paymentProcessing',
    Equipment: 'equipment',
    'Office Supplies': 'officeSupplies',
    'Professional Services': 'professionalServices',
    'Shipping Supplies': 'shippingSupplies',
    'Branding Materials': 'brandingMaterials',
    Other: 'other',
  };
  return categoryMap[category] || 'other';
};
